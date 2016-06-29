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
        var map = null;
        var mapPointerCorrdinateChangeCallBack = null;
        var vectorLayer = null;
        var drawingInteractionTypes = [ol.interaction.Draw,
            ol.interaction.Translate,
            ol.interaction.Modify,
            ol.interaction.Select];

        this.initialize = function (divElement) {
            initialize(divElement);
        };

        this.registerMapPointerCorrdinateChange = function (callBack) {
            mapPointerCorrdinateChangeCallBack = callBack;
        };

        this.drawingInteractionActive = function () {
            return anyDrawingInteractionActive();
        };

        this.togglePolygonDrawingInteraction = function () {
            removeActiveInteractions();
            toggleDrawingInteraction('Polygon');
        };

        this.toggleLineStringDrawingInteraction = function () {
            removeActiveInteractions();
            toggleDrawingInteraction('LineString');
        };

        this.togglePointDrawingInteraction = function () {
            removeActiveInteractions();
            toggleDrawingInteraction('Point');
        };

        this.toggleCircleDrawingInteraction = function () {
            removeActiveInteractions();
            toggleDrawingInteraction('Circle');
        };

        this.toggleModifyDrawingInteraction = function () {
            removeActiveInteractions();
            addModifyInteractions();
        };

        this.toggleDeleteDrawingInteraction = function () {
            removeActiveInteractions();
            addDeleteInteraction();
        };

        function initialize(divElement) {
            map = new ol.Map({
                target: divElement
            });

            var geographicLayers = getGeographicLayers();
            geographicLayers.forEach(function (layer) {
                map.addLayer(layer);
            });

            var rasterLayers = createRasterLayers();
            rasterLayers.forEach(function (layer) {
                map.addLayer(layer);
            });

            vectorLayer = createVectorLayer();
            map.addLayer(vectorLayer);

            var view = createView();
            map.setView(view);

            registerMapPointerCorrdinateChange(map, ol, function (coordinate) {
                if (mapPointerCorrdinateChangeCallBack) {
                    mapPointerCorrdinateChangeCallBack(coordinate);
                }
            });
        }

        function createVectorLayer() {
            var layer = new ol.layer.Vector({
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
            }).done(function (response) {
                var formatWFS = new ol.format.WFS();
                var features = formatWFS.readFeatures(response);
                vectorLayer.getSource().addFeatures(features);
            }).fail(function (jqXHR, textStatus) {
                alert('WFS query error:' + textStatus);
            });
        }

        function createRasterLayers() {
            var backgroundWmsLayer = new ol.layer.Tile({
                source: new ol.source.TileWMS({
                    url: 'http://localhost:9000/geoserver/test01/wms',
                    params: { 'LAYERS': 'test01:Assets1,test01:Assets2,test01:Assets3', 'CQL_FILTER': 'FluidId in (1,2,7,10);FluidId in (2,4,8,9);FluidId in (1,2,5,10)' },
                    serverType: 'geoserver'
                })
            });

            var netGisLinesWmsLayer = new ol.layer.Tile({
                source: new ol.source.TileWMS({
                    url: 'http://localhost:9000/geoserver/test01/wms',
                    params: { 'LAYERS': 'test01:NetGisLines' },
                    serverType: 'geoserver'
                })
            });

            var netGisPointsWmsLayer = new ol.layer.Tile({
                source: new ol.source.TileWMS({
                    url: 'http://localhost:9000/geoserver/test01/wms',
                    params: { 'LAYERS': 'test01:NetGisPoints' },
                    serverType: 'geoserver'
                })
            });

            return [backgroundWmsLayer, netGisLinesWmsLayer, netGisPointsWmsLayer];
        }

        function toggleDrawingInteraction(drawingType) {
            var interaction = getInteraction(map, ol.interaction.Draw);
            if (interaction) {
                map.removeInteraction(interaction);
                if (interaction.type_ == drawingType) {
                    return;
                }
            }
            var source = vectorLayer.getSource();
            var drawingInteraction = createDrawingInteraction(source, drawingType);
            drawingInteraction.on('drawend', function (e) {
                transactWFS('insert', e.feature);
            });
            map.addInteraction(drawingInteraction);
            drawingInteraction.on('drawend', function (e) {
                console.log("-----------------------");
                console.log(e);
            });
        }

        function toggleDeleteDrawingInteraction() {
            interaction = new ol.interaction.Select();
            interaction.getFeatures().on('change:length', function (e) {
                var feature = interaction.getFeatures().item(0);
                if (!feature) return;
                transactWFS('delete', feature);
                vectorLayer.getSource().removeFeature(feature);
                interaction.getFeatures().clear();
                selectPointerMove.getFeatures().clear();
            });
            map.addInteraction(interaction);
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
            var layer = new ol.layer.Tile({
                source: new ol.source.OSM()
            });
            layer.setOpacity(.3);
            return [layer];
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

        function GetWfsCommand(action, feature) {
            var addedFeatures, updatedFeatures, deletedFeatures;
            switch (action) {
                case 'insert':
                    addedFeatures = [feature];
                    break;
                case 'update':
                    updatedFeatures = [feature];
                    break;
                case 'delete':
                    deletedFeatures = [feature];
                    break;
            }
            var gmlFormat = new ol.format.GML({
                featureNS: 'http://bsr.ores.be/test01',
                featureType: 'Districts',
                srsName: 'EPSG:31370'
            });
            var wfsFormat = new ol.format.WFS();
            var command = wfsFormat.writeTransaction(addedFeatures, updatedFeatures, deletedFeatures, gmlFormat);
            return command;
        }

        function postCommandToVectorFeaturesService(commandText) {
            $.ajax('http://localhost:9000/geoserver/test01/ows', {
                type: 'POST',
                dataType: 'xml',
                processData: false,
                contentType: 'text/xml',
                data: commandText
            }).done(function (response) {
                var formatWFS = new ol.format.WFS();
                var r = formatWFS.readTransactionResponse(response);
                if (r.transactionSummary.totalDeleted !== 1
                    && r.transactionSummary.totalInserted !== 1
                    && r.transactionSummary.totalUpdated !== 1) {
                    alert('WFS Transaction error' + JSON.stringify(r.transactionSummary));
                }
            }).fail(function (jqXHR, textStatus) {
                alert('WFS Transaction error:' + textStatus);
            });
        }

        function transactWFS(action, feature) {
            feature.set('DistrictName', "XXX");
            //feature.set('DistrictId', 12345);
            //feature.setGeometryName("DistrictGeo"); 
            var command = GetWfsCommand(action, feature);
            var serializer = new XMLSerializer();
            var commandText = serializer.serializeToString(command);
            commandText = commandText.replace("<geometry>", "<DistrictGeo>");
            commandText = commandText.replace("</geometry>", "</DistrictGeo>");
            postCommandToVectorFeaturesService(commandText);
        }

        function addModifyInteractions() {
            var selectInteraction = getSelectInteraction(vectorLayer);
            var features = selectInteraction.getFeatures();
            map.addInteraction(selectInteraction);
            map.addInteraction(getModifyInteraction(features));
            map.addInteraction(getTranslateInteraction(features));
        }

        function getSelectInteraction(layer) {
            var interaction = new ol.interaction.Select({
                //style: Styles.redLiningEditStyle,
                layers: [layer]
            });
            return interaction;
        }

        function getModifyInteraction(features) {
            return new ol.interaction.Modify({
                //style: Styles.redLiningEditStyle,
                features: features
            });
        }

        function getTranslateInteraction(features) {
            return new ol.interaction.Translate({
                //style: Styles.redLiningEditStyle,
                features: features
            });
        }

        function removeActiveInteractions() {
            var activeInterations = map.getInteractions().getArray();
            drawingInteractionTypes.forEach(function (type) {
                var list = _.filter(activeInterations, function (obj) {
                    return obj instanceof type;
                });
                list.forEach(function (interaction) {
                    map.removeInteraction(interaction);
                });
            });
        };

        function anyDrawingInteractionActive() {
            var activeInterations = map.getInteractions().getArray();
            drawingInteractionTypes.forEach(function (type) {
                var x = _.some(map.getInteractions().getArray(), function (obj) {
                    return obj instanceof ol.interaction.Draw;
                });
                if (x) {
                    return true;
                }
            });
            return false;
        };

        function addDeleteInteraction() {
            var interaction = new ol.interaction.Select();
            interaction.getFeatures().on('change:length', function(e) {
                var feature = interaction.getFeatures().item(0);
                if(!feature) return;
                transactWFS('delete', feature);
                vectorLayer.getSource().removeFeature(feature);
                interaction.getFeatures().clear();
                //selectPointerMove.getFeatures().clear();
            });
            map.addInteraction(interaction);
        }        
    }
} ());
