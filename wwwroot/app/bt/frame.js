(function () {
    'use strict';

    angular.module('btModule')
        .directive('swFrame', function () {
            return {
                restrict: 'E',
                transclude: {
                    'map': 'swFrameMap',
                    'sidebar': 'swFrameSidebar',
                    'cursorPositionBox': 'swFrameCursorPositionBox'
                },
                scope: {},
                templateUrl: 'swFrame.html',
                controller: function ($scope) {
                    $scope.panes = [];
                    $scope.selectedPane = null;
                    $scope.anyPaneSelected = function () {
                        return $scope.selectedPane != null;
                    }
                    $scope.toggle = function (pane) {
                        if ($scope.selectedPane == pane) {
                            pane.selected = false;
                            $scope.selectedPane = null;
                        }
                        else {
                            if ($scope.selectedPane != null) {
                                $scope.selectedPane.selected = false;
                            }
                            pane.selected = true;
                            $scope.selectedPane = pane;
                        }
                    }
                    this.add = function (pane) {
                        $scope.panes.push(pane);
                        if(pane.selected) {
                            $scope.selectedPane = pane;
                        }
                    }
                }
            }
        });

    angular.module('btModule')
        .directive('swPane', function () {
            return {
                restrict: 'E',
                transclude: true,
                scope: {
                    title: '@',
                    selected: '@'
                },
                templateUrl: 'swPane.html',
                require: '^swFrame',
                link: function (scope, el, attrs, tabstripCtrl) {
                    tabstripCtrl.add(scope);
                }
            }
        });

    angular.module('btModule')
        .directive('swSidebar', function () {
            return {
                restrict: 'E',
                transclude: true,
                scope: {},
                templateUrl: 'swSidebar.html',
                controller: function ($scope) {
                    $scope.buttons = [];
                    $scope.selectedbutton = null;
                    $scope.anybuttonSelected = function () {
                        return $scope.selectedbutton != null;
                    }
                    $scope.toggle = function (button) {
                        if ($scope.selectedbutton == button) {
                            button.selected = false;
                            $scope.selectedbutton = null;
                        }
                        else {
                            if ($scope.selectedbutton != null) {
                                $scope.selectedbutton.selected = false;
                            }
                            button.selected = true;
                            $scope.selectedbutton = button;
                        }
                        button.click();
                    }
                    this.add = function (button) {
                        button.selected = false;
                        $scope.buttons.push(button);
                    }
                }
            }
        });

    angular.module('btModule')
        .directive('swSidebarButton', function () {
            return {
                restrict: 'E',
                template: '',
                scope: {
                    title: '@',
                    icon: '@',
                    image: '@',
                    click: '&'
                },
                require: '^swSidebar',
                link: function (scope, el, attrs, toolbarCtrl) {
                    toolbarCtrl.add(scope);
                }
            }
        });
})();