(function () {
    'use strict';

    var app = angular.module('app');

    app.config(['$stateProvider', '$urlRouterProvider', 
        function ($stateProvider, $urlRouterProvider) {
            $stateProvider.state('home', {
                    url: '/',
                    views: {
                        '@': { templateUrl: 'app/welcomeView.html' }
                    }
                })
                
                .state('bt', {
                    //abstract: true,
                    url: '/bt',
                    views: {
                        '@': { 
                            templateUrl: 'app/bt/frame.html',
                            controller: 'mapCtrl as vm2'
                        }
                    }
                })                
                .state('bt.2', {
                    url: '/bt.2',
                    views: {
                        '@': {
                            templateUrl: 'app/bt/btModule.html',
                            controller: 'btModule as vm'
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