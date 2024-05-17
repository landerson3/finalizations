import sys, os, json, subprocess
sys.path.insert(0, os.path.expanduser('~'))
from gx_api import galaxy_api_class

approved_params = {
		'query':[{
			'RetouchStatus':'Approved',
			#'RetoucherName':'Brad Killeen',
			'omit': "false",
			'WIPS_PATH':'*'
		},
	]
}

gx = galaxy_api_class.gx_api(production=False)
res = gx.find_records(approved_params)
#print(json.dumps(res, indent=4))
wip_paths = [i['fieldData']['WIPS_PATH'] for i in res['response']['data']]
with open('wips.txt','w') as wips_file:
	for i,path in enumerate(wip_paths):
		path = path.replace(":","/").strip()
		path = f'/Volumes/{path}'
		
		if i == len(wip_paths) - 1:
			wips_file.write(f'{path}')
		else:
			wips_file.write(f'{path}\n')

#		if i > 1:
#			break

wips_file.close()

# subprocess.run(args=['/Applications/Adobe Photoshop 2024/Adobe Photoshop 2024.app/Contents/MacOS/Adobe Photoshop 2024','-r',os.path.expanduser("~/finalizations/finalize_assets.jsx")])

get_record_params = []

with open('finals.txt', 'r') as finals_file:
	for line in finals_file:
		filename = line.strip()
		filename_query = {'cRetoucher_ ImageName':filename}
		get_record_params.append(filename_query)

params = {'query':get_record_params}
res = gx.find_records(params)
recordIds = [i['recordId'] for i in res['response']['data']]
wip_paths = [i['fieldData']['WIPS_PATH'] for i in res['response']['data']]

for i,record in enumerate(recordIds):
	final_path = wip_paths[i].replace("WIPS","FINAL").replace(".psb",".tif")
	gx.update_record(recordIds[i], data={"RetouchStatus":"AutoCompleted", "FINAL_PATH":final_path})