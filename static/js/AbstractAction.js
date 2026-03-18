//import { useService } from "@web/core/utils/hooks";
odoo.define('gpsmap_street.action', function (require) {
    "use strict";

    const Dialog = require('web.Dialog');
    
    var class_gpsmap = require('gpsmap.action');
    var core = require('web.core');
    const _t = core._t;
    var session = require('web.session');
    var rpc = require('web.rpc');
    var QWeb = core.qweb;

    var local = {};
    var coordinate_active = undefined;
    
    local.streetonline = class_gpsmap.extend({
        contentTemplate: 'gpsmaps_streetonline',   
        start: function() {
            alert("start hijo");
            var data = this._super.apply(this, arguments);
            this._initMap();
            this.positions();
            return data;
        },
        _initMap: function(idmap) {
            var self=create_map(this);
            this.obj_map=self.obj_map;
        },

         execute_streetMap: function (vehicle)
         {
             var coordinates = {latitude:vehicle["lat"],longitude:vehicle["lon"]};
 
             if(coordinate_active  ==  undefined) coordinate_active = {};
             var txt_active = coordinate_active["latitude"] + "," + coordinate_active["longitude"];
             var txt_history = coordinates["latitude"] + "," + coordinates["longitude"];
 
             var txt = txt_active + " " + txt_history;
 
             if(txt_active != txt_history)
             {
                 coordinate_active = coordinates;
                 var posicion = LatLng(coordinates);
 
                 this.centerMap(posicion);
                 var curso = vehicle["cou"];
                 var panoramaOptions = {
                     position: posicion,
                     visible: true,
                     pov: {
                         heading:  curso,
                         pitch:    10
                     }
                 };

                var streetDiv = document.getElementById('street');

                if (streetDiv) {
                    var panorama = new google.maps.StreetViewPanorama(
                        streetDiv,
                        panoramaOptions
                    );
                    this.obj_map.setStreetView(panorama);
                } else {
                    console.error("El contenedor 'street' no existe en el DOM.");
                }
             }            
         },

    });
    core.action_registry.add('gpsmap_street.streetonline', local.streetonline);
});
