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

gx = galaxy_api_class.gx_api(production=True)
res = gx.find_records(approved_params)
#print(json.dumps(res, indent=4))
wip_paths = [i['fieldData']['WIPS_PATH'] for i in res['response']['data']]
with open('wips.txt','w') as my_file:
	for i,path in enumerate(wip_paths):
		path = path.replace(":","/").strip()
		path = f'/Volumes/{path}'
		my_file.write(f'{path}\n')
		if i > 1:
			break

my_file.close()
subprocess.run(args=['/Applications/Adobe Photoshop 2024/Adobe Photoshop 2024.app/Contents/MacOS/Adobe Photoshop 2024','-r',os.path.expanduser("~/finalizations/finalize_assets.jsx")])