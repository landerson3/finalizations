import sys, os, subprocess, threading, time, signal, logging, datetime
sys.path.insert(0, os.path.expanduser('~'))
from gx_api import galaxy_api_class
from slack_bot import slack_bot

logging.basicConfig(filename = "finalizations.log", encoding = "utf-8", level = logging.DEBUG, format='%(asctime)s %(levelname)-8s %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
logger = logging.getLogger(__name__)
logger.info(f"Start time: {datetime.datetime.now()}. Machine: {os.uname()[1]}")

IDLE_CPU_USAGE = 1.5


if os.path.exists('./finals.txt'): os.remove('./finals.txt')
if os.path.exists('./errors.txt'): os.remove('./errors.txt')


# Global to control production/testing. Set to true for production and false for testing. Testing uses the GX sandbox.
PRODUCTION_STATE = True


# Params for req approved files from GX
approved_params = {
		'query':[
		{
			'RetouchStatus':'Approved',
			'omit': "false",
			'WIPS_PATH':'*'
		},
		{
			'omit':'true',
			'RetoucherName':'*Finalizer'
		}
	]
}


def get_process_cpu_usage(PID, recurse = True):
	# try:
	result = subprocess.run(['ps','-p',str(PID),'-o','%cpu'],capture_output=True, text=True, check=True)
	cpu_usage = result.stdout.splitlines()[1].strip()
	res = float(cpu_usage)
	logger.debug(f"Processor usage for PID {PID} is {res}")
	if res < IDLE_CPU_USAGE and recurse:
		time.sleep(1)
		return get_process_cpu_usage(PID, False)
	return res
	# except:
	# 	return 0

gx = galaxy_api_class.gx_api(production = PRODUCTION_STATE)
# get approved file from GX
res = gx.find_records(approved_params)
# build wips paths and write to doc


wip_paths = [i['fieldData']['WIPS_PATH'] for i in res['response']['data']]
logger.info(f"{len(wip_paths)} WIPs found for processing")
logger.debug("\n".join(wip_paths))

def update_assignee(res, add_finalizer = True)->None:
	if 'response' not in res:
		return
	init_data = [(i['recordId'],i['fieldData']['RetoucherName'],i['fieldData']['EntryID']) for i in res['response']['data']]
	if add_finalizer:
		for record in init_data:
			gx.update_record(record[0], data = {'RetoucherName':f"{record[1]} - Finalizer"})
	else:
		for record in init_data:
			gx.update_record(record[0], data = {'RetoucherName':f'{record[1].replace(" - Finalizer", "")}'})
update_assignee(res)

gx.logout()
def finalize_file(file):
	photoshop_path = '/Applications/Adobe Photoshop 2024/Adobe Photoshop 2024.app/Contents/MacOS/Adobe Photoshop 2024'
	jsx_file = os.path.expanduser("~/finalizations/finalize_assets.jsx")
	cmd = [
		photoshop_path,
		file,
		"-executeScript",
		jsx_file
	]
	open_proc = subprocess.Popen(cmd,stdin = subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
	# print(f'I am an error: {open_proc.stderr.read().decode()}')
	time.sleep(2) ## wait for photoshop to start processing - because of readtime on the file running concurrent to this time.sleep, we shouldn't need a heavy process to check this.

	while(get_process_cpu_usage(open_proc.pid) > IDLE_CPU_USAGE):
		time.sleep(.25)
		continue
	logger.debug(f'Attempting to kill process for file {file}')
	os.kill(open_proc.pid, signal.SIGTERM)
	
attempted_wips =[]	
for i,wip in enumerate(wip_paths):
	wip = wip.replace(":","/").strip()
	wip = f'/Volumes/{wip}'
	attempted_wips.append(os.path.basename(wip).replace('.psb','.tif'))
	logger.info(f'Attempting to finalize file: {wip}')
	finalize_file(wip)
	
	


get_record_params = []
completed_wip_count = 0
total_completed_files = []
gx_search_error_files = []
# get the files from the finalize_assets.jsx output
if os.path.exists('finals.txt'):
	with open('finals.txt', 'r') as finals_file:
		for line in finals_file:
			filename = line.strip()
			try:
				attempted_wips.remove(filename)
			except Exception as err:
				logger.warning(f"Unable to process {filename} to GX. Error: {err}")
				gx_search_error_files.append(filename)
			filename_query = {'cRetoucher_ ImageName':filename}
			get_record_params.append(filename_query)
	gx = galaxy_api_class.gx_api(production = PRODUCTION_STATE)
	update_assignee(res, False)
	# get records associated w/ finals from GX
	params = {'query':get_record_params}
	res = gx.find_records(params)
	try:
		recordIds = [i['recordId'] for i in res['response']['data']]
		wip_paths = [i['fieldData']['WIPS_PATH'] for i in res['response']['data']]
	except Exception as e:
		print(e)
		pass
	# update the records in GX with the appropriate path and retouch status

	if 'response' in res:
		for i,record in enumerate(recordIds):
			final_path = wip_paths[i].replace("WIPS","FINAL").replace(".psb",".tif")
			fpath = '/Volumes/'+final_path.replace(':','/')
			if os.path.exists(fpath):
				total_completed_files.append(os.path.basename(fpath))
				gx.update_record(recordIds[i], data={"RetouchStatus":"AutoCompleted", "FINAL_PATH":final_path})
				completed_wip_count+=1
			else:
				gx_search_error_files.append(fpath)
				with open('errors.txt','a') as error_log:
					error_log.write(f'Path not available due to finalization error: {final_path}\n')
	gx.logout()

## send results of completed and errors to slack channel
slack = slack_bot.slack_bot()
data = {
	'channel':'finalizations',
	'text':f'{completed_wip_count} file(s) finalized and set to AutoCompleted. {len(attempted_wips)} file(s) with FINALIZATION ERRORS. {len(gx_search_error_files)} file(s) with GX Search ERRORS.'
}
response = slack.chat(**data)
if 'ts' in response:
	ts_code = response['ts'] if response['ok'] else None
	if len(total_completed_files) != 0:
		data = {
			'channel':'finalizations',
			'text':f'Total Completed Files:\n{'\n'.join(total_completed_files)}',
			'thread_ts':ts_code
		}
		response = slack.chat(**data)
		time.sleep(1)
	if len(attempted_wips) != 0:
		data = {
			'channel':'finalizations',
			'text':f'Finalization Errors:\n{'\n'.join(attempted_wips)}',
			'thread_ts':ts_code
		}
		response = slack.chat(**data)
		time.sleep(1)
	if len(gx_search_error_files) != 0:
		data = {
			'channel':'finalizations',
			'text':f'GX Search Errors:\n{'\n'.join(gx_search_error_files)}',
			'thread_ts':ts_code
		}
		response = slack.chat(**data)
