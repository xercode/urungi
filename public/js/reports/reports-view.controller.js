(function () {
    'use strict';

    angular.module('app.reports').controller('ReportsViewController', ReportsViewController);

    ReportsViewController.$inject = ['$scope', '$timeout', '$uibModal', 'Noty', 'gettextCatalog', 'api', 'xlsxService', 'userService', 'report'];

    function ReportsViewController ($scope, $timeout, $uibModal, Noty, gettextCatalog, api, xlsxService, userService, report) {
        const vm = this;

        vm.downloadAsPDF = downloadAsPDF;
        vm.downloadAsPNG = downloadAsPNG;
        vm.exportAsPNGAvailable = false;
        vm.exportAsPDFAvailable = false;
        vm.report = report;
        vm.prompts = {};
        vm.getPrompts = getPrompts;
        vm.repaintWithPrompts = repaintWithPrompts;
        vm.saveAsXLSX = saveAsXLSX;
        vm.isAdmin = false;
        vm.mandatoryPrompts = false;
        vm.numberOfRows = 0;
        vm.showPagination = false;
        vm.numPerPage = 15;
        vm.currentPage = 1;
        vm.pages = 15;
        vm.goToPage = goToPage;

        activate();

        function activate () {
            userService.getCurrentUser().then(user => {
                vm.isAdmin = user.isAdmin();
            }, () => {});

            if( undefined !== vm.report.reportType && vm.report.reportType !== 'grid') {
                api.isReportAsPNGAvailable(report._id).then(available => {
                    vm.exportAsPNGAvailable = available;
                });
                api.isReportAsPDFAvailable(report._id).then(available => {
                    vm.exportAsPDFAvailable = available;
                });
            }

            vm.prompts = initPrompts();
            refresh();
        }

        function refresh () {
            $timeout(function () {
                $scope.$broadcast('repaint', { fetchData: (vm.mandatoryPrompts)?false:true });
                $('.filter-run').hide();
                $('.filter-run').last().show();
            }, 0);
        }
        function initPrompts () {
            const prompts = {};
            for (const filter of vm.report.properties.filters) {
                if (filter.filterPrompt) {
                    const p = {};
                    for (const key in filter) {
                        p[key] = filter[key];
                    }
                    p.criterion = {};
                    prompts[p.id + p.filterType] = p;
                    if (filter.promptMandatory === true){
                        vm.mandatoryPrompts = true;
                    }
                }
            }

            return prompts;
        }

        function getPrompts () {
            return Object.values(vm.prompts);
        }

        function repaintWithPrompts () {
            vm.currentPage = 1;
            const filterCriteria = {};
            for (const i in vm.prompts) {
                filterCriteria[i] = vm.prompts[i].criterion;
            }

            $scope.$broadcast('repaint', {
                fetchData: true,
                filters: filterCriteria
            });
        }

        function saveAsXLSX () {
            api.getReportData(vm.report).then(function (res) {
                xlsxService.saveReportAsXLSX(vm.report, res.data);
            });
        }

        function downloadAsPDF () {
            const modal = $uibModal.open({
                component: 'appPdfExportSettingsModal',
            });

            return modal.result.then(function (settings) {
                return api.getReportAsPDF(vm.report._id, settings).then(res => {
                    download(res.data, 'application/pdf', vm.report.reportName + '.pdf');
                }, () => {
                    new Noty({ text: gettextCatalog.getString('The export failed. Please contact the system administrator.'), type: 'error' }).show();
                });
            }, () => {});
        }

        function downloadAsPNG () {
            api.getReportAsPNG(vm.report._id).then(res => {
                download(res.data, 'image/png', vm.report.reportName + '.png');
            }, () => {
                new Noty({ text: gettextCatalog.getString('The export failed. Please contact the system administrator.'), type: 'error' }).show();
            });
        }

        function download (data, type, filename) {
            const a = document.createElement('a');
            a.download = filename;
            a.href = 'data:' + type + ';base64,' + data;
            a.dispatchEvent(new MouseEvent('click'));
        }

        function goToPage (page) {
            vm.currentPage = page;
            refresh();
        }
    }
})();
