import sys, os, json, subprocess
sys.path.insert(0, os.path.expanduser('~'))
from gx_api import galaxy_api_class

# Global to control production/testing. Set to true for production and false for testing. Testing uses the GX sandbox.
PRODUCTION_STATE = False

# Params for req approved files from GX
approved_params = {
		'query':[{
			'RetouchStatus':'Approved',
			'omit': "false",
			'WIPS_PATH':'*'
		},
	]
}

gx = galaxy_api_class.gx_api(PRODUCTION_STATE)
# get approved file from GX
res = gx.find_records(approved_params)
# build wips paths and write to doc
wip_paths = [i['fieldData']['WIPS_PATH'] for i in res['response']['data']]
with open('wips.txt','w') as wips_file:
	for i,path in enumerate(wip_paths):
		
		# Debugging limits, only on for PRODUCTION_STATE false
		if PRODUCTION_STATE == False and i <50: continue
		elif PRODUCTION_STATE == False and i > 120: break

		path = path.replace(":","/").strip()
		path = f'/Volumes/{path}'
		if i == len(wip_paths) - 1:
			wips_file.write(f'{path}')
		else:
			wips_file.write(f'{path}\n')

# call finalize_assets.jsx to finalize files from the list
subprocess.run(args=['/Applications/Adobe Photoshop 2024/Adobe Photoshop 2024.app/Contents/MacOS/Adobe Photoshop 2024','-r',os.path.expanduser("~/finalizations/finalize_assets.jsx")])

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