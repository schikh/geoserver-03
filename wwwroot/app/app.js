(function () {
    'use strict';

    var app = angular.module('app', [
            'ui.bootstrap',
            //'ngResource',
            //'ui.mask',
            'btModule',
            'ui.router',
            'ngAnimate'
            ]);
            
    angular.module('customerManagement', ['ngResource']);
    var btModule = angular.module('btModule', []);  
        
    app.config(function ($provide) {
        $provide.decorator('$exceptionHandler',
            ['$delegate',
                function ($delegate) {
                    return function (exception, cause) {
                        exception.message = 'Please contact the Help Desk! \n Message: ' +
                            exception.message;
                        $delegate(exception, cause);
                        alert(exception.message);
                    };
                }]);
    });
}());
