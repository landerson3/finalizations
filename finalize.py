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

with open('finals.txt', 'r') as finals_file:
	for line in finals_file:
		filename = line.strip()
		res = gx.find_records(params = {'query':[{'cRetoucher_ ImageName': filename,'omit': "false"}]})
		recordId = [i['recordId'] for i in res['response']['data']]
		wip_path = [i['fieldData']['WIPS_PATH'] for i in res['response']['data']]

		if len(recordId) == 1 and len(wip_path) == 1:
			final_path = wip_path[0].replace("WIPS","FINAL").replace(".psb",".tif")
			gx.update_record(recordId[0], data={"RetouchStatus":"AutoCompleted", "FINAL_PATH":final_path})
		else:
			print('problems') # Add logic to handle redundant GX filenames
			break
		
		#data = {"RetouchStatus":"Ready for Retouching", "OutlinePath" : i[1].replace(".tif",extension).replace("Processed","Outlines")}

		#print(json.dumps(res, indent=4))
		#print(recordId)