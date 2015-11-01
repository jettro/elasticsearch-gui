controllerModule.controller('WhereShardsCtrl',['$scope', '$timeout', 'elastic',
function WhereShardsCtrl($scope, $timeout, elastic) {
    $scope.shardsInfo = {};
    $scope.nodeInfo = {};
    $scope.init = function () {
        obtainShardsInfo();
    };

    function obtainShardsInfo() {
        elastic.obtainShards(function (nodeInfo,data) {
            var nodes = {};
            angular.forEach(data, function (shards, indexName) {
                angular.forEach(shards.shards, function (shardArray,shardKey) {
                    angular.forEach(shardArray, function(shard) {
                        var desc;
                        if (shard.primary) {
                            desc = " (P)";
                        } else {
                            desc = " (R)";
                        }
                        if (!nodes[shard.node]) {
                            nodes[shard.node]={};
                        }
                        if (!nodes[shard.node][indexName]) {
                            nodes[shard.node][indexName]=[];
                        }
                        nodes[shard.node][indexName].push(shard.shard + desc)
                    });
                });
            });
            $scope.nodeInfo = nodeInfo;
            $scope.shardsInfo = nodes;
        });
        $timeout(function() {
            obtainShardsInfo();
        }, 5000);
    }
}]);
