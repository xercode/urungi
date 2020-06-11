(function () {
    'use strict';

    angular.module('app.dashboards').config(configure);

    configure.$inject = ['$routeProvider'];

    function configure ($routeProvider) {
        $routeProvider.when('/dashboards/view/:dashboardID', {
            templateUrl: 'partials/dashboards/view.html',
            controller: 'DashboardsViewController',
            controllerAs: 'vm',
            resolve: {
                dashboard: function ($route, api) {
                    return api.getDashboardForView($route.current.params.dashboardID, undefined);
                },
            },
            isPublic: true,
        });

        $routeProvider.when('/dashboards/view/:dashboardID/:urlParams', {
            templateUrl: 'partials/dashboards/view.html',
            controller: 'DashboardsViewController',
            controllerAs: 'vm',
            resolve: {
                dashboard: function ($route, api) {
                    let dataApi;
                    dataApi = api.getDashboardForView($route.current.params.dashboardID);

                    let urlParams = $route.current.params.urlParams;
                    let urlFilters = {};

                    if(urlParams) {
                        let array = urlParams.split('&');
                        array.forEach(function (entry) {
                            let array2 = entry.split('=');
                            let key = array2[0];
                            let value = array2[1];
                            urlFilters[key] = value;
                        })
                    }

                    dataApi.then(function(data) {
                        let reports;
                        reports = data.reports;
                        reports.forEach(function(report) {
                            let filters;
                            filters = report.properties.filters;
                            filters.forEach(function(filter){
                                if(urlFilters[filter.elementName] && filter.promptUrl){
                                    filter.criterion.text1 = urlFilters[filter.elementName];
                                }
                            })
                        });
                    });

                    return dataApi;
                },
            },
            isPublic: true,
        });

        $routeProvider.when('/dashboards/list', {
            templateUrl: 'partials/dashboards/list.html',
            controller: 'DashboardsListController',
            controllerAs: 'vm',
        });

        $routeProvider.when('/dashboards/new/:newDashboard/', {
            templateUrl: 'partials/dashboards/edit.html',
            controller: 'DashboardEditController',
            controllerAs: 'vm',
        });

        $routeProvider.when('/dashboards/edit/:dashboardID/', {
            templateUrl: 'partials/dashboards/edit.html',
            controller: 'DashboardEditController',
            controllerAs: 'vm',
        });

        $routeProvider.when('/dashboards/push/:dashboardID/', {
            templateUrl: 'partials/dashboards/edit.html',
            controller: 'DashboardEditController',
            controllerAs: 'vm',
        });
    }
})();
