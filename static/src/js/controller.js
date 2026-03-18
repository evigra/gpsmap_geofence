/** @odoo-module **/

import { registry } from "@web/core/registry";
import { formView } from "@web/views/form/form_view";
import { FormController } from "@web/views/form/form_controller";

import {
    onMounted,
    onPatched,
    onWillUnmount,
} from "@odoo/owl";


let googleMapsPromise = null;


/*
 * ============================================================
 * CARGAR GOOGLE MAPS
 * ============================================================
 */

function loadGoogleMaps(apiKey) {

    /*
     * Ya está cargado
     */
    if (
        window.google &&
        window.google.maps
    ) {

        return Promise.resolve();

    }


    /*
     * Ya se está cargando
     */
    if (googleMapsPromise) {

        return googleMapsPromise;

    }


    googleMapsPromise =
        new Promise(
            (resolve, reject) => {

                const script =
                    document.createElement(
                        "script"
                    );


                script.src =
                    "https://maps.googleapis.com/maps/api/js" +
                    "?key=" +
                    encodeURIComponent(apiKey);


                script.async = true;

                script.defer = true;


                script.onload =
                    () => {

                        console.log(
                            "GPSMAP_GEOFENCE: Google Maps cargado"
                        );

                        resolve();

                    };


                script.onerror =
                    () => {

                        console.error(
                            "GPSMAP_GEOFENCE: No se pudo cargar Google Maps"
                        );

                        googleMapsPromise = null;

                        reject(
                            new Error(
                                "Google Maps no pudo cargarse"
                            )
                        );

                    };


                document.head.appendChild(
                    script
                );

            }
        );


    return googleMapsPromise;

}


/*
 * ============================================================
 * CONTROLLER
 * ============================================================
 */

export class GeofenceFormController
    extends FormController {


    setup() {

        super.setup();


        console.log(
            "GPSMAP_GEOFENCE: Controller iniciado"
        );


        /*
         * ====================================================
         * VARIABLES
         * ====================================================
         */

        this.map = null;

        this.polygon = null;

        this.tempPolygon = null;

        this.drawing = false;

        this.points = [];

        this.mapClickListener = null;

        this.mapDblClickListener = null;

        this.polygonListeners = [];

        this.mapInitialized = false;

        this.drawButton = null;


        /*
         * ID del registro actual
         *
         * Se utiliza para detectar
         * Anterior / Siguiente
         */
        this.currentRecordId = null;


        /*
         * ResizeObserver
         *
         * Detecta cuando el mapa vuelve
         * a ser visible dentro del notebook
         */
        this.mapResizeObserver = null;


        /*
         * ====================================================
         * ON MOUNTED
         * ====================================================
         */

        onMounted(
            async () => {

                console.log(
                    "GPSMAP_GEOFENCE: onMounted"
                );


                await this._initMap();

            }
        );


        /*
         * ====================================================
         * ON PATCHED
         * ====================================================
         *
         * Se ejecuta cuando Odoo actualiza
         * la vista, incluyendo cambios de
         * registro y cambios de pestaña.
         */

        onPatched(
            async () => {

                /*
                 * Primero comprobamos si cambió
                 * el registro.
                 */
                await this._checkRecordChange();


                /*
                 * Después verificamos el tamaño
                 * del mapa.
                 */
                this._resizeMap();

            }
        );


        /*
         * ====================================================
         * ON WILL UNMOUNT
         * ====================================================
         */

        onWillUnmount(
            () => {

                this._destroyMap();

            }
        );

    }


    /*
     * ============================================================
     * INICIALIZAR MAPA
     * ============================================================
     */

    async _initMap() {

        console.log(
            "GPSMAP_GEOFENCE: inicializando mapa"
        );


        const mapDiv =
            document.getElementById(
                "geofence_map"
            );


        console.log(
            "GPSMAP_GEOFENCE: geofence_map =",
            mapDiv
        );


        if (!mapDiv) {

            console.error(
                "GPSMAP_GEOFENCE: No existe #geofence_map"
            );

            return;

        }


        /*
         * Evitar crear el mapa dos veces
         */
        if (this.mapInitialized) {

            return;

        }


        try {

            /*
             * ==================================================
             * COLOCA AQUÍ TU API KEY
             * ==================================================
             */

            await loadGoogleMaps(
                "TU_API_KEY"
            );


            console.log(
                "GPSMAP_GEOFENCE: Google Maps disponible"
            );


            /*
             * ==================================================
             * CREAR MAPA
             * ==================================================
             */

            this.map =
                new google.maps.Map(
                    mapDiv,
                    {

                        center: {

                            lat: 20.6597,

                            lng: -103.3496

                        },


                        zoom: 12,


                        mapTypeId:
                            "roadmap",


                        streetViewControl:
                            false,


                        fullscreenControl:
                            true,


                        mapTypeControl:
                            true

                    }
                );


            this.mapInitialized =
                true;


            console.log(
                "GPSMAP_GEOFENCE: Mapa creado"
            );


            /*
             * ==================================================
             * GUARDAR ID DEL REGISTRO
             * ==================================================
             */

            this.currentRecordId =
                this.model.root.resId;


            /*
             * ==================================================
             * CREAR BOTÓN
             * ==================================================
             */

            this._createButton();


            /*
             * ==================================================
             * OBSERVAR CAMBIOS DE TAMAÑO
             * ==================================================
             */

            this._observeMapSize(
                mapDiv
            );


            /*
             * ==================================================
             * CARGAR POLÍGONO EXISTENTE
             * ==================================================
             */

            this._loadPolygon();


            /*
             * ==================================================
             * AJUSTAR MAPA
             * ==================================================
             */

            this._resizeMap();


        } catch (error) {

            console.error(
                "GPSMAP_GEOFENCE: ERROR GOOGLE MAPS:",
                error
            );

        }

    }


    /*
     * ============================================================
     * OBSERVAR TAMAÑO DEL MAPA
     * ============================================================
     *
     * Esto es lo que permite que el mapa funcione
     * correctamente cuando está dentro de un notebook
     * de Odoo.
     */

    _observeMapSize(mapDiv) {

        /*
         * Si ya existe un observer,
         * eliminarlo.
         */

        if (this.mapResizeObserver) {

            this.mapResizeObserver.disconnect();

            this.mapResizeObserver =
                null;

        }


        /*
         * ResizeObserver es compatible
         * con los navegadores modernos.
         */

        if (
            typeof ResizeObserver ===
            "undefined"
        ) {

            console.warn(
                "GPSMAP_GEOFENCE: ResizeObserver no disponible"
            );

            return;

        }


        this.mapResizeObserver =
            new ResizeObserver(
                (entries) => {

                    for (
                        const entry of entries
                    ) {

                        const width =
                            entry.contentRect.width;


                        const height =
                            entry.contentRect.height;


                        console.log(
                            "GPSMAP_GEOFENCE: tamaño mapa:",
                            width,
                            "x",
                            height
                        );


                        /*
                         * Si el mapa vuelve a ser visible
                         */
                        if (
                            width > 0 &&
                            height > 0
                        ) {

                            this._resizeMap();

                        }

                    }

                }
            );


        this.mapResizeObserver.observe(
            mapDiv
        );

    }


    /*
     * ============================================================
     * REDIMENSIONAR MAPA
     * ============================================================
     */

    _resizeMap() {

        if (!this.map) {

            return;

        }


        const mapDiv =
            document.getElementById(
                "geofence_map"
            );


        if (!mapDiv) {

            return;

        }


        /*
         * Obtener dimensiones actuales
         */

        const width =
            mapDiv.offsetWidth;


        const height =
            mapDiv.offsetHeight;


        /*
         * Si está oculto, no hacemos nada.
         */

        if (
            width === 0 ||
            height === 0
        ) {

            return;

        }


        /*
         * Esperar a que Odoo termine
         * de mostrar la pestaña.
         */

        setTimeout(
            () => {

                if (!this.map) {

                    return;

                }


                console.log(
                    "GPSMAP_GEOFENCE: recalculando mapa"
                );


                /*
                 * Forzar recálculo de Google Maps
                 */

                google.maps.event.trigger(
                    this.map,
                    "resize"
                );


                /*
                 * Si existe polígono,
                 * volver a centrarlo.
                 */

                if (this.polygon) {

                    const bounds =
                        new google.maps.LatLngBounds();


                    const path =
                        this.polygon.getPath();


                    for (
                        let i = 0;
                        i < path.getLength();
                        i++
                    ) {

                        bounds.extend(
                            path.getAt(i)
                        );

                    }


                    if (
                        !bounds.isEmpty()
                    ) {

                        this.map.fitBounds(
                            bounds
                        );

                    }

                }

            },
            100
        );

    }


    /*
     * ============================================================
     * DETECTAR CAMBIO DE REGISTRO
     * ============================================================
     *
     * Anterior / Siguiente
     */

    async _checkRecordChange() {

        /*
         * Todavía no existe el mapa
         */

        if (!this.map) {

            return;

        }


        /*
         * Obtener ID actual de Odoo
         */

        const recordId =
            this.model.root.resId;


        console.log(
            "GPSMAP_GEOFENCE: ID actual:",
            recordId
        );


        /*
         * No cambió el registro
         */

        if (
            recordId ===
            this.currentRecordId
        ) {

            return;

        }


        console.log(
            "GPSMAP_GEOFENCE: CAMBIO DE REGISTRO:",
            this.currentRecordId,
            "=>",
            recordId
        );


        /*
         * Guardar nuevo ID
         */

        this.currentRecordId =
            recordId;


        /*
         * Eliminar polígono anterior
         */

        this._removePolygon();


        /*
         * Cargar polígono del nuevo registro
         */

        this._loadPolygon();


        /*
         * Ajustar mapa
         */

        this._resizeMap();

    }


    /*
     * ============================================================
     * ELIMINAR POLÍGONO
     * ============================================================
     */

    _removePolygon() {

        /*
         * Quitar listeners
         */

        this._removePolygonListeners();


        /*
         * Eliminar polígono
         */

        if (this.polygon) {

            this.polygon.setMap(
                null
            );

            this.polygon =
                null;

        }


        /*
         * Eliminar polígono temporal
         */

        if (this.tempPolygon) {

            this.tempPolygon.setMap(
                null
            );

            this.tempPolygon =
                null;

        }


        /*
         * Limpiar puntos
         */

        this.points = [];

    }


    /*
     * ============================================================
     * CREAR BOTÓN
     * ============================================================
     */

    _createButton() {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.innerHTML =
            "✏️ Dibujar polígono";


        button.style.background =
            "#ffffff";


        button.style.border =
            "1px solid #aaa";


        button.style.borderRadius =
            "4px";


        button.style.padding =
            "8px 12px";


        button.style.margin =
            "10px";


        button.style.cursor =
            "pointer";


        button.style.fontSize =
            "14px";


        button.style.boxShadow =
            "0 2px 6px rgba(0,0,0,.3)";


        button.addEventListener(
            "click",
            () => {

                if (this.drawing) {

                    this._finishDrawing();

                } else {

                    this._startDrawing();

                }

            }
        );


        /*
         * Colocar botón en Google Maps
         */

        this.map.controls[
            google.maps.ControlPosition.TOP_CENTER
        ].push(
            button
        );


        this.drawButton =
            button;

    }


    /*
     * ============================================================
     * INICIAR DIBUJO
     * ============================================================
     */

    _startDrawing() {

        console.log(
            "GPSMAP_GEOFENCE: Iniciando dibujo"
        );


        /*
         * Eliminar polígono existente
         */

        if (this.polygon) {

            this._removePolygon();

        }


        /*
         * Limpiar temporal
         */

        if (this.tempPolygon) {

            this.tempPolygon.setMap(
                null
            );

            this.tempPolygon =
                null;

        }


        this.points = [];

        this.drawing =
            true;


        /*
         * Cambiar botón
         */

        this.drawButton.innerHTML =
            "⛔ Terminar polígono";


        /*
         * Cursor
         */

        this.map.setOptions({

            draggableCursor:
                "crosshair"

        });


        /*
         * ========================================================
         * CLICK
         * ========================================================
         */

        this.mapClickListener =
            this.map.addListener(
                "click",
                (event) => {

                    this._addPoint(
                        event.latLng
                    );

                }
            );


        /*
         * ========================================================
         * DOBLE CLICK
         * ========================================================
         */

        this.mapDblClickListener =
            this.map.addListener(
                "dblclick",
                (event) => {

                    event.stop();

                    this._finishDrawing();

                }
            );

    }


    /*
     * ============================================================
     * AGREGAR PUNTO
     * ============================================================
     */

    _addPoint(latLng) {

        if (!this.drawing) {

            return;

        }


        this.points.push({

            lat:
                latLng.lat(),

            lng:
                latLng.lng()

        });


        console.log(
            "GPSMAP_GEOFENCE: Punto:",
            latLng.lat(),
            latLng.lng()
        );


        /*
         * Crear polígono temporal
         */

        if (!this.tempPolygon) {

            this.tempPolygon =
                new google.maps.Polygon({

                    map:
                        this.map,


                    paths:
                        this.points,


                    strokeColor:
                        "#2196F3",


                    strokeOpacity:
                        1,


                    strokeWeight:
                        2,


                    fillColor:
                        "#2196F3",


                    fillOpacity:
                        0.20,


                    clickable:
                        false

                });

        } else {

            this.tempPolygon.setPath(
                this.points
            );

        }

    }


    /*
     * ============================================================
     * TERMINAR DIBUJO
     * ============================================================
     */

    _finishDrawing() {

        if (!this.drawing) {

            return;

        }


        /*
         * Mínimo 3 puntos
         */

        if (
            this.points.length < 3
        ) {

            alert(
                "Debes colocar al menos 3 puntos."
            );

            return;

        }


        console.log(
            "GPSMAP_GEOFENCE: Finalizando polígono"
        );


        /*
         * Eliminar temporal
         */

        if (this.tempPolygon) {

            this.tempPolygon.setMap(
                null
            );

            this.tempPolygon =
                null;

        }


        /*
         * Crear polígono definitivo
         */

        this.polygon =
            new google.maps.Polygon({

                map:
                    this.map,


                paths:
                    this.points,


                strokeColor:
                    "#1565C0",


                strokeOpacity:
                    1,


                strokeWeight:
                    2,


                fillColor:
                    "#2196F3",


                fillOpacity:
                    0.35,


                editable:
                    true,


                draggable:
                    false

            });


        this.drawing =
            false;


        /*
         * Restaurar cursor
         */

        this.map.setOptions({

            draggableCursor:
                null

        });


        /*
         * Eliminar evento click
         */

        if (
            this.mapClickListener
        ) {

            google.maps.event.removeListener(
                this.mapClickListener
            );

            this.mapClickListener =
                null;

        }


        /*
         * Eliminar evento doble click
         */

        if (
            this.mapDblClickListener
        ) {

            google.maps.event.removeListener(
                this.mapDblClickListener
            );

            this.mapDblClickListener =
                null;

        }


        /*
         * Restaurar botón
         */

        this.drawButton.innerHTML =
            "✏️ Dibujar polígono";


        /*
         * Guardar coordenadas
         */

        this._savePolygon();


        /*
         * Escuchar modificaciones
         */

        this._listenPolygon();

    }


    /*
     * ============================================================
     * GUARDAR POLÍGONO
     * ============================================================
     *
     * FORMATO:
     *
     * lng lat,lng lat,lng lat
     *
     * EJEMPLO:
     *
     * -103.72412 20.65932,-103.72123 20.66123,-103.71988 20.65765
     *
     * EXACTAMENTE 5 DECIMALES.
     */

    _savePolygon() {

        if (!this.polygon) {

            return;

        }


        const path =
            this.polygon.getPath();


        const coordinates = [];


        for (
            let i = 0;
            i < path.getLength();
            i++
        ) {

            const item =
                path.getAt(i);


            coordinates.push(

                item.lng().toFixed(5) +
                " " +
                item.lat().toFixed(5)

            );

        }


        const value =
            coordinates.join(",");


        console.log(
            "GPSMAP_GEOFENCE: GUARDANDO:",
            value
        );


        /*
         * Guardar en Odoo
         */

        this.model.root.update({

            polygon_coords:
                value

        });

    }


    /*
     * ============================================================
     * ESCUCHAR EDICIÓN DEL POLÍGONO
     * ============================================================
     */

    _listenPolygon() {

        this._removePolygonListeners();


        if (!this.polygon) {

            return;

        }


        const path =
            this.polygon.getPath();


        /*
         * Mover vértice
         */

        this.polygonListeners.push(

            path.addListener(
                "set_at",
                () => {

                    this._savePolygon();

                }
            )

        );


        /*
         * Agregar vértice
         */

        this.polygonListeners.push(

            path.addListener(
                "insert_at",
                () => {

                    this._savePolygon();

                }
            )

        );


        /*
         * Eliminar vértice
         */

        this.polygonListeners.push(

            path.addListener(
                "remove_at",
                () => {

                    this._savePolygon();

                }
            )

        );

    }


    /*
     * ============================================================
     * CARGAR POLÍGONO EXISTENTE
     * ============================================================
     *
     * Lee:
     *
     * lng lat,lng lat,lng lat
     *
     * NO utiliza JSON.parse().
     */

    _loadPolygon() {

        const value =
            this.model.root.data
                .polygon_coords;


        console.log(
            "GPSMAP_GEOFENCE: LEYENDO polygon_coords:",
            value
        );


        /*
         * No existe polígono
         */

        if (
            !value ||
            typeof value !== "string"
        ) {

            console.log(
                "GPSMAP_GEOFENCE: Registro sin polígono"
            );

            return;

        }


        /*
         * Separar puntos por coma
         */

        const coordinates =
            value
                .split(",")
                .map(
                    (item) => {

                        /*
                         * Cada elemento es:
                         *
                         * lng lat
                         */

                        const parts =
                            item
                                .trim()
                                .split(/\s+/);


                        if (
                            parts.length !== 2
                        ) {

                            console.warn(
                                "GPSMAP_GEOFENCE: Coordenada inválida:",
                                item
                            );

                            return null;

                        }


                        /*
                         * PRIMERO LONGITUD
                         */

                        const lng =
                            parseFloat(
                                parts[0]
                            );


                        /*
                         * SEGUNDO LATITUD
                         */

                        const lat =
                            parseFloat(
                                parts[1]
                            );


                        /*
                         * Validar
                         */

                        if (
                            Number.isNaN(lng) ||
                            Number.isNaN(lat)
                        ) {

                            console.warn(
                                "GPSMAP_GEOFENCE: Coordenada no numérica:",
                                item
                            );

                            return null;

                        }


                        return {

                            lng:
                                lng,

                            lat:
                                lat

                        };

                    }
                )
                .filter(
                    (item) =>
                        item !== null
                );


        /*
         * Mínimo 3 puntos
         */

        if (
            coordinates.length < 3
        ) {

            console.warn(
                "GPSMAP_GEOFENCE: Menos de 3 puntos"
            );

            return;

        }


        console.log(
            "GPSMAP_GEOFENCE: COORDENADAS:",
            coordinates
        );


        /*
         * Si ya existe un polígono,
         * eliminarlo antes de cargar el nuevo.
         */

        if (this.polygon) {

            this._removePolygon();

        }


        /*
         * ========================================================
         * CREAR POLÍGONO
         * ========================================================
         */

        this.polygon =
            new google.maps.Polygon({

                paths:
                    coordinates,


                map:
                    this.map,


                strokeColor:
                    "#1565C0",


                strokeOpacity:
                    1,


                strokeWeight:
                    2,


                fillColor:
                    "#2196F3",


                fillOpacity:
                    0.35,


                editable:
                    true,


                draggable:
                    false

            });


        /*
         * ========================================================
         * AJUSTAR MAPA AL POLÍGONO
         * ========================================================
         */

        const bounds =
            new google.maps.LatLngBounds();


        coordinates.forEach(
            (point) => {

                bounds.extend(

                    new google.maps.LatLng(
                        point.lat,
                        point.lng
                    )

                );

            }
        );


        if (
            !bounds.isEmpty()
        ) {

            this.map.fitBounds(
                bounds
            );

        }


        /*
         * Escuchar modificaciones
         */

        this._listenPolygon();


        console.log(
            "GPSMAP_GEOFENCE: Polígono cargado correctamente"
        );

    }


    /*
     * ============================================================
     * ELIMINAR LISTENERS DEL POLÍGONO
     * ============================================================
     */

    _removePolygonListeners() {

        this.polygonListeners.forEach(
            (listener) => {

                google.maps.event.removeListener(
                    listener
                );

            }
        );


        this.polygonListeners =
            [];

    }


    /*
     * ============================================================
     * DESTRUIR
     * ============================================================
     */

    _destroyMap() {

        console.log(
            "GPSMAP_GEOFENCE: Destruyendo Geofence"
        );


        /*
         * Eventos del mapa
         */

        if (
            this.mapClickListener
        ) {

            google.maps.event.removeListener(
                this.mapClickListener
            );

            this.mapClickListener =
                null;

        }


        if (
            this.mapDblClickListener
        ) {

            google.maps.event.removeListener(
                this.mapDblClickListener
            );

            this.mapDblClickListener =
                null;

        }


        /*
         * Listeners del polígono
         */

        this._removePolygonListeners();


        /*
         * ResizeObserver
         */

        if (
            this.mapResizeObserver
        ) {

            this.mapResizeObserver.disconnect();

            this.mapResizeObserver =
                null;

        }


        /*
         * Polígono
         */

        if (this.polygon) {

            this.polygon.setMap(
                null
            );

            this.polygon =
                null;

        }


        /*
         * Polígono temporal
         */

        if (this.tempPolygon) {

            this.tempPolygon.setMap(
                null
            );

            this.tempPolygon =
                null;

        }


        /*
         * Limpiar referencias
         */

        this.map =
            null;


        this.drawButton =
            null;


        this.mapInitialized =
            false;


        this.currentRecordId =
            null;

    }

}


/*
 * ============================================================
 * REGISTRAR VISTA ODOO
 * ============================================================
 */

registry.category("views").add(
    "geofence_form",
    {

        ...formView,

        Controller:
            GeofenceFormController

    }
);