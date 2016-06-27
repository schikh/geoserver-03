(function () {
    "use strict";

    angular.module('btModule')
        .factory('mapService', ['ol', function (ol) {
            //Todo: move after angular initialization
            configureLambertProjection();

            return {
                getInstance: function () {
                    return new service();
                }
            }

            function configureLambertProjection() {
                // Set LAMBERT PROJECTION - EPSG 31370
                var def = "+proj=lcc +lat_1=51.16666723333333 +lat_2=49.8333339 +lat_0=90 +lon_0=4.367486666666666 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.869,52.2978,-103.724,0.3366,-0.457,1.8422,-1.2747 +units=m +no_defs";
                proj4.defs("EPSG:31370", def);
                proj4.defs("http://www.opengis.net/gml/srs/epsg.xml#31370", def);
            }            
        }]);

        function service() {
            var map;
            var mapPointerCorrdinateChangeCallBack;
            var vectorLayer;

            this.initialize = function (divElement) {
                initialize(divElement);
            };

            this.registerMapPointerCorrdinateChange = function (callBack) {
                mapPointerCorrdinateChangeCallBack = callBack;
            };

            this.drawingInteractionActive = function () {
                return _.some(map.getInteractions().getArray(), function (obj) {
                    return obj instanceof ol.interaction.Draw;
                });
            };

            this.togglePolygonDrawingInteraction = function () {
                toggleDrawingInteraction('Polygon');
            };

            this.toggleLineStringDrawingInteraction = function () {
                toggleDrawingInteraction('LineString');
            };

            this.togglePointDrawingInteraction = function () {
                toggleDrawingInteraction('Point');
            };

            this.toggleCircleDrawingInteraction = function () {
                toggleDrawingInteraction('Circle');
            };   
        
            function initialize(divElement) {
                map = new ol.Map({
                    target: divElement
                });

                var geographicLayers = getGeographicLayers();
                geographicLayers.forEach(function (layer) {
                    //map.addLayer(layer);
                });

                var rasterLayers = createRasterLayers();
                rasterLayers.forEach(function (layer) {
                    //map.addLayer(layer);
                });

                //var drawingLayerFeatures = createDrawingLayerFeatures();
                // drawingLayerFeatures.on('add', function(event) {
                //     console.log('layer changed in some way');
                //     console.log(event);
                //     // event.type == 'beforepropertychange'
                //     // event.key == '<the key that is changing>'
                // });

                // var drawingLayer = createDrawingLayer(drawingLayerFeatures);
                // map.addLayer(drawingLayer);

                vectorLayer = createVectorLayer();
                map.addLayer(vectorLayer);

                var view = createView();
                map.setView(view);

                // var modifyInteraction = createModifyInteraction(drawingLayerFeatures);
                // map.addInteraction(modifyInteraction);

                registerMapPointerCorrdinateChange(map, ol, function (coordinate) {
                    if (mapPointerCorrdinateChangeCallBack) {
                        mapPointerCorrdinateChangeCallBack(coordinate);
                    }
                });
            }

            function createVectorLayer() {
                var layer =  new ol.layer.Vector({
                    source: new ol.source.Vector({
                        loader: queryVectorFeaturesService,
                        //strategy: ol.loadingstrategy.bbox
                        strategy: ol.loadingstrategy.tile(ol.tilegrid.createXYZ({
                            maxZoom: 20
                        }))			
                    })
                });
                return layer;
            }

            function queryVectorFeaturesService(extent) {
                $.ajax('http://localhost:9000/geoserver/test01/ows?service=WFS', {
                    type: 'GET',
                    data: {
                        service: 'WFS',
                        version: '1.1.0',
                        request: 'GetFeature',
                        typename: 'test01:Districts',
                        srsname: 'EPSG:31370',
                        bbox: extent.join(',') + ',EPSG:31370'
                    }
                }).done(function(response) {
                    var formatWFS = new ol.format.WFS();
                    var features = formatWFS.readFeatures(response);
                    vectorLayer.getSource().addFeatures(features);
                }).fail(function(jqXHR, textStatus) {
                    alert('WFS query error:' + textStatus);
                });
            }

            function createRasterLayers() {
                var backgroundWmsLayer = new ol.layer.Tile({
                    source: new ol.source.TileWMS({
                    url: 'http://localhost:9000/geoserver/test01/wms',
                    params: {'LAYERS': 'test01:Assets1,test01:Assets2,test01:Assets3', 'CQL_FILTER': 'FluidId in (1,2,7,10);FluidId in (2,4,8,9);FluidId in (1,2,5,10)'},
                    serverType: 'geoserver'
                    })
                });

                var netGisLinesWmsLayer = new ol.layer.Tile({
                    source: new ol.source.TileWMS({
                    url: 'http://localhost:9000/geoserver/test01/wms',
                    params: {'LAYERS': 'test01:NetGisLines'},
                    serverType: 'geoserver'
                    })
                });

                var netGisPointsWmsLayer = new ol.layer.Tile({
                    source: new ol.source.TileWMS({
                    url: 'http://localhost:9000/geoserver/test01/wms',
                    params: {'LAYERS': 'test01:NetGisPoints'},
                    serverType: 'geoserver'
                    })
                });

                return [backgroundWmsLayer, netGisLinesWmsLayer, netGisPointsWmsLayer];
            }

            function toggleDrawingInteraction(drawingType) {
                var interaction = getInteraction(map, ol.interaction.Draw);
                if (interaction) {
                    map.removeInteraction(interaction);
                    if(interaction.type_ == drawingType) {
                        return;
                    }
                }
                var source = vectorLayer.getSource();
                var drawingInteraction = createDrawingInteraction(source, drawingType);
                map.addInteraction(drawingInteraction);
                	drawingInteraction.on('drawend', function(e) {
		            console.log("-----------------------");
		            console.log(e);
	            });
            }

            function getInteraction(map, interactionType) {
                return _.find(map.getInteractions().getArray(), function (obj) {
                    return obj instanceof interactionType;
                });
            }

            function interactionActive(map, interactionType) {
                return _.some(map.getInteractions().getArray(), function (obj) {
                    return obj instanceof interactionType;
                });
            }

            function registerMapPointerCorrdinateChange(map, ol, callBack) {
                map.on('pointermove', function (e) {
                    //var coordinate = ol.proj.transform(e.coordinate, 'EPSG:3857', 'EPSG:4326');
                    callBack(e.coordinate);
                });
            }

            function createView() {
                var view = new ol.View({
                    projection: new ol.proj.Projection({
                        code: 'EPSG:31370',
                        units: 'm'
                    }),
                    center: [147000, 111000],
                    zoom: 14
                });
                return view;
            }

            function getGeographicLayers() {
                var format = new ol.format.TopoJSON();
                var tileGrid = ol.tilegrid.createXYZ({ maxZoom: 19 });
                var roadStyleCache = {};
                var roadColor = {
                    'path': 'pink',
                    'major_road': 'green',
                    'minor_road': 'bleu',
                    'highway': 'red'
                };
                var landuseStyleCache = {};
                var buildingStyle = new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: '#666',
                        opacity: 0.4
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#444',
                        width: 1
                    })
                });
                var sourceVector = new ol.source.VectorTile({
                    format: format,
                    tileGrid: tileGrid,
                    url: 'http://{a-c}.tile.openstreetmap.us/vectiles-highroad/{z}/{x}/{y}.topojson'
                });
                var layers = [
                    new ol.layer.VectorTile({
                        source: sourceVector,
                        style: function (feature) {
                            var kind = feature.get('kind');
                            var railway = feature.get('railway');
                            var sort_key = feature.get('sort_key');
                            var styleKey = kind + '/' + railway + '/' + sort_key;
                            var style = roadStyleCache[styleKey];
                            if (!style) {
                                var color, width;
                                if (railway) {
                                    color = 'red';
                                    width = 1;
                                } else {
                                    color = roadColor[kind];
                                    width = kind == 'highway' ? 1.5 : 1;
                                }
                                style = new ol.style.Style({
                                    stroke: new ol.style.Stroke({
                                        color: color,
                                        width: width
                                    }),
                                    zIndex: sort_key
                                });
                                roadStyleCache[styleKey] = style;
                            }
                            return style;
                        }
                    })
                ];
                return layers;
            }

            function createDrawingLayer(features) {
                var layer = new ol.layer.Vector({
                    //source: new ol.source.Vector({ features: features }),
                    style: new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: 'rgba(255, 255, 255, 0.2)'
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#ffcc33',
                            width: 2
                        }),
                        image: new ol.style.Circle({
                            radius: 7,
                            fill: new ol.style.Fill({
                                color: '#ffcc33'
                            })
                        })
                    })
                });
                return layer;
            }

            function createModifyInteraction(features) {
                var interaction = new ol.interaction.Modify({
                    features: features,
                    // the SHIFT key must be pressed to delete vertices, so
                    // that new vertices can be drawn at the same position
                    // of existing vertices
                    deleteCondition: function (event) {
                        return ol.events.condition.shiftKeyOnly(event) &&
                            ol.events.condition.singleClick(event);
                    }
                });
                return interaction;
            }

            function createDrawingInteraction(source, drawingType) {
                var interaction = new ol.interaction.Draw({
                    type: drawingType,
                    source: source,
                    style: new ol.style.Style({
                        image: new ol.style.RegularShape({
                            stroke: new ol.style.Stroke({ color: 'red', width: 1 }),
                            points: 4,
                            radius: 30,
                            radius2: 0,
                            angle: 0
                        }),
                        stroke: new ol.style.Stroke({
                            color: 'red',
                            width: 1
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(255, 0, 0, 0.3)'
                        })
                    }),
                    active: true
                });
                return interaction;
            }
        };
} ());
