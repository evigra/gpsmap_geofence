{
    'name' : 'GPSMap - GeoFence',
    'price' : '89.0',
    'currency' : 'EUR',
    'license' : 'LGPL-3',
    'images': ['static/description/map_online.png'],

    'author': "SolesGPS :: Eduardo Vizcaino",
    'category': 'Human Resources/Fleet GPS',
    "version": "16.0.0.0.0",
    'website' : 'https://solesgps.com',
    'summary' : 'Locate the satellite coordinates that your GPS devices throw. Save that information here and see it on the map.',
    'description' : """
GPS DEVICES
=====================================
With this module, we will help you to manage your GPS devices, with which you will be able to see the vehicles of your fleet on a map.

Main features
-------------
* Add GPS devices and relate them to the vehicles.
* Geolocate your vehicles on the map, minute by minute.
* Make a simulation of the geolocation history.
* Generates reports with speed, fuel, mileage.
""",
    'depends': [
        'gpsmap',
    ],
    'data': [
        # DATA
        #'security/security.xml',
        #'security/ir.model.access.csv',

        # VIEW
        'views/menuitem.xml',
        'views/gps_geofence.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'gpsmap_geofence/static/src/js/controller.js',
            'gpsmap_geofence/static/src/xml/geofence.xml',
        ],      
        'web.assets_qweb': [
            #'/gpsmap_street/static/xml/*.xml',
        ],        

    },    


    #'demo': ['data/demo.xml'],
    'installable': True,
    'application': False,
}