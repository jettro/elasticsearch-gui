angular.module('guiapp').controller('MonitoringCtrl',['$scope', 'elastic', '$interval',
    function ($scope, elastic, $interval) {
    $scope.dataNodes=[];
    $scope.columnsNodes=[{"id":"num-nodes","type":"line","name":"Number of nodes"}];
    $scope.datax={"id":"x"};

    $scope.dataShards=[];
    $scope.columnsShards=[{"id":"num-shards-primary","type":"line","name":"Primary"},
        {"id":"num-shards-active","type":"line","name":"Active"},
        {"id":"num-shards-relocating","type":"line","name":"Relocating"},
        {"id":"num-shards-initializing","type":"line","name":"Initializing"},
        {"id":"num-shards-unassigned","type":"line","name":"Unassigned"}];
    $scope.dataxShards={"id":"xShards"};

    $scope.numPoints=10;
    $scope.lengthDelay=5000;

    var timerLoadNodes;
    $scope.loadNodes = function () {
        timerLoadNodes = $interval(function(){
            elastic.clusterNodes(function(data){
                if ($scope.dataNodes.length >= $scope.numPoints) {
                    $scope.dataNodes = $scope.dataNodes.splice(1,$scope.numPoints);
                }
                $scope.dataNodes.push({"x":new Date(),"num-nodes":Object.keys(data).length});
            });

            elastic.clusterHealth(function (data) {
                if ($scope.dataShards.length >= $scope.numPoints) {
                    $scope.dataShards = $scope.dataShards.splice(1,$scope.numPoints);
                }
                $scope.dataShards.push({"xShards":new Date(),
                    "num-shards-primary":data.active_primary_shards,
                    "num-shards-active":data.active_shards,
                    "num-shards-relocating":data.relocating_shards,
                    "num-shards-initializing":data.initializing_shards,
                    "num-shards-unassigned":data.unassigned_shards});
            });

        },$scope.lengthDelay);
    };

    $scope.loadNodes();
    // TODO add stop function
}]);
