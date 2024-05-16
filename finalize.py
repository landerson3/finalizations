import sys, os, json
sys.path.insert(0, os.path.expanduser('~'))
from gx_api import galaxy_api_class

approved_params = {
		'query':[{
			'RetouchStatus':'Approved',
			#'RetoucherName':'Brad Killeen',
			'omit': "false",
		},
	]
}

def get_approved_wips_paths() -> list:
	gx = galaxy_api_class.gx_api(production=True)
	res = gx.find_records(approved_params)
	#print(json.dumps(res, indent=4))
	wip_paths = [i['fieldData']['WIPS_PATH'] for i in res['response']['data']]
	for path in wip_paths:
		path = path.replace(":","/").strip()
		path = f'/Volumes/{path}'
		#print(path)
	return wip_paths

