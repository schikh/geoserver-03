(function () {
    'use strict';

    var app = angular.module('app');

    app.config(['$stateProvider', '$urlRouterProvider', 
        function ($stateProvider, $urlRouterProvider) {
            $stateProvider.state('home', {
                    url: '/',
                    views: {
                        '@': { templateUrl: 'app/homePage.html' }
                    }
                })
                
                .state('map', {
                    //abstract: true,
                    url: '/map',
                    views: {
                        '@': { 
                            templateUrl: 'app/bt/frame.html',
                            controller: 'mapCtrl as vm2'
                        }
                    }
                });
            $urlRouterProvider.otherwise('/');
        }
    ]);

    app.run(['$rootScope', '$state', '$stateParams',
        function ($rootScope, $state, $stateParams) {
            $rootScope.$state = $state;
            $rootScope.$stateParams = $stateParams;
        }
    ]);
})();