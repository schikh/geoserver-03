(function () {
    "use strict";

    angular.module('btModule')
        .value('ol', ol);

    angular.module('btModule')
        .controller('mapCtrl', ['$scope', 'mapService', function ($scope, mapService) {
            var vm = this;
            vm.mapService = mapService.getInstance();
            vm.name = 'mapCtrl';
            vm.pointerCoordinate = null;
            vm.mapService.registerMapPointerCorrdinateChange(function (value) {
                $scope.$apply(function () {
                    vm.pointerCoordinate = value;
                });
            });
        }]);

    angular.module('btModule')
        .directive('swMap', ['ol', function (ol) {
            return {
                restrict: 'E',
                transclude: true,
                scope: { mapService: '=' },
                templateUrl: 'swMap.html',
                compile: function () {
                    return {
                        pre: function (scope, element, attributes, controller) {
                            var div = element[0].querySelector('div');
                            scope.mapService.initialize(div);
                        },
                        post: function (scope) {
                        }
                    }
                }
            }
        }]);

    angular.module('btModule')
        .directive('swDrawingInteraction', ['ol', function (ol) {
            return {
                restrict: "E",
                scope: { mapService: '=' },
                link: function (scope, element, attributes, swMap) {
                    scope.mapService.togglePolygonDrawingInteraction();
                }
            };
        }]);

    angular.module('btModule')
        .filter('coordinateFormat', ['ol', function (ol) {
            return function (coordinate) {
                return ol.coordinate.format(coordinate, '{y}, {x}', 4);
            };
        }]);
} ());
