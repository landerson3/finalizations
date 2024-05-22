import sys, os, subprocess, threading, time, signal
sys.path.insert(0, os.path.expanduser('~'))
from gx_api import galaxy_api_class

if os.path.exists('./finals.txt'): os.remove('./finals.txt')


# TERMINATE_THREAD = False
# def frozen_app_handler():
# 	while not TERMINATE_THREAD:
# 		try:
# 			time.sleep(5)
# 			# Use the 'ps' command to get a list of all processes
# 			result = subprocess.run(['ps', 'aux'], stdout=subprocess.PIPE, text=True)
# 			# Iterate over each line of the output
# 			for line in result.stdout.splitlines():
# 				# Split the line into columns based on whitespace
# 				columns = line.split()
# 				if len(columns) > 10:
# 					# The process name is in the 10th column for 'ps aux' output
# 					process_name = columns[10]
					
# 					# Check for processes that are marked as 'stat' in 'ps' output
# 					# Typically, 'D' or 'T' can indicate uninterruptible sleep (usually IO) and stopped process
# 					process_stat = columns[7]
# 					if 'D' in process_stat or 'T' in process_stat:
# 						pid = columns[1]
# 						if "Photoshop" not in process_name: continue
# 						print(f"Application '{process_name}' (PID {pid}) might be not responding (stat: {process_stat})")
# 						os.kill(pid, signal.SIGTERM)
						
# 		except Exception as e:
# 			print(f"An error occurred: {e}")


# params for req approved files from GX
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
	if res == 0 and recurse:
		time.sleep(2)
		return get_process_cpu_usage(PID, False)
	return res
	# except:
	# 	return 0

gx = galaxy_api_class.gx_api(production=False)
# get approved file from GX
res = gx.find_records(approved_params)
# build wips paths and write to doc
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
	while(get_process_cpu_usage(open_proc.pid)>0): 
		time.sleep(.25)
		continue
	os.kill(open_proc.pid, signal.SIGTERM)
	# sub_p_args = ['/Applications/Adobe Photoshop 2024/Adobe Photoshop 2024.app/Contents/MacOS/Adobe Photoshop 2024','-r',os.path.expanduser("~/finalizations/finalize_assets.jsx")]
	# photoshop_thread = threading.Thread(target = subprocess.run, args = (sub_p_args,))
	# photoshop_thread.start()
	# photoshop_thread.join(timeout=240)
		
	# while photoshop_thread.is_alive():
	# 	# check clock time
	# 	clkid = time.pthread_getcpuclockid(photoshop_thread.ident)
	# 	print(time.clock_gettime(clkid), flush = True)
	

for wip in wip_paths:
	wip = wip.replace(":","/").strip()
	wip = f'/Volumes/{wip}'
	finalize_file(wip)


# finalize_files()
# TERMINATE_THREAD = True

get_record_params = []

# get the files from the finalize_assets.jsx output
with open('finals.txt', 'r') as finals_file:
	for line in finals_file:
		filename = line.strip()
		filename_query = {'cRetoucher_ ImageName':filename}
		get_record_params.append(filename_query)

# get records associated w/ finals from GX
params = {'query':get_record_params}
res = gx.find_records(params)
recordIds = [i['recordId'] for i in res['response']['data']]
wip_paths = [i['fieldData']['WIPS_PATH'] for i in res['response']['data']]
# update the records in GX with the appropriate path and retouch status
for i,record in enumerate(recordIds):
	final_path = wip_paths[i].replace("WIPS","FINAL").replace(".psb",".tif")
	if os.path.exists(final_path):
		gx.update_record(recordIds[i], data={"RetouchStatus":"AutoCompleted", "FINAL_PATH":final_path})
	else:
		with open('errors.txt','a') as error_log:
			error_log.writelines(f'Path not available due to finalization error: {final_path}')