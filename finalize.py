import sys, os, subprocess, threading, time, signal
sys.path.insert(0, os.path.expanduser('~'))
from gx_api import galaxy_api_class

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
	]
}


def get_process_cpu_usage(PID, recurse = True):
	# try:
	result = subprocess.run(['ps','-p',str(PID),'-o','%cpu'],capture_output=True, text=True, check=True)
	cpu_usage = result.stdout.splitlines()[1].strip()
	res = float(cpu_usage)
	if res < IDLE_CPU_USAGE and recurse:
		time.sleep(2)
		return get_process_cpu_usage(PID, False)
	return res
	# except:
	# 	return 0

gx = galaxy_api_class.gx_api(production = PRODUCTION_STATE)
# get approved file from GX
res = gx.find_records(approved_params)
# build wips paths and write to doc
gx.logout()
wip_paths = [i['fieldData']['WIPS_PATH'] for i in res['response']['data']]


def finalize_file(file):
	photoshop_path = '/Applications/Adobe Photoshop 2024/Adobe Photoshop 2024.app/Contents/MacOS/Adobe Photoshop 2024'
	jsx_file = os.path.expanduser("~/finalizations/finalize_assets.jsx")
	cmd = [
		photoshop_path,
		file,
		"-executeScript",
		jsx_file
	]
	open_proc = subprocess.Popen(cmd,stdin = subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
		)
	# wiat for it to start FUCK
	while(get_process_cpu_usage(open_proc.pid)==0): 
		time.sleep(.25)
		continue
	# wait for it to fucking finish
	while(get_process_cpu_usage(open_proc.pid)>IDLE_CPU_USAGE): 
		time.sleep(.25)
		continue
	os.kill(open_proc.pid, signal.SIGTERM)
	
	
for i,wip in enumerate(wip_paths):
	# continue
	wip = wip.replace(":","/").strip()
	wip = f'/Volumes/{wip}'
	finalize_file(wip)
	# if i > 20:
	# 	break


get_record_params = []

# get the files from the finalize_assets.jsx output
with open('finals.txt', 'r') as finals_file:
	for line in finals_file:
		filename = line.strip()
		filename_query = {'cRetoucher_ ImageName':filename}
		get_record_params.append(filename_query)
gx = galaxy_api_class.gx_api(production = PRODUCTION_STATE)
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
for i,record in enumerate(recordIds):
	final_path = wip_paths[i].replace("WIPS","FINAL").replace(".psb",".tif")
	if os.path.exists('/Volumes/'+final_path.replace(':','/')):
		gx.update_record(recordIds[i], data={"RetouchStatus":"AutoCompleted", "FINAL_PATH":final_path})
	else:
		with open('errors.txt','a') as error_log:
			error_log.write(f'Path not available due to finalization error: {final_path}\n')
gx.logout()