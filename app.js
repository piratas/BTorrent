/* global WebTorrent, angular, moment, prompt */

const VERSION = '0.17.6'

const trackers = ['wss://tracker.btorrent.xyz', 'wss://tracker.openwebtorrent.com', 'wss://tracker.fastcast.nz']

const rtcConfig = {
  'iceServers': [
    {
      'urls': 'stun:stun.l.google.com:19305'
    }
  ]
}

const torrentOpts = {
  announce: trackers
}

const trackerOpts = {
  announce: trackers,
  rtcConfig: rtcConfig
}

const debug = window.localStorage.getItem('debug') != null

const dbg = function (string, item, color) {
  color = color != null ? color : '#333333'
  if (debug) {
    if ((item != null) && item.name) {
      return console.debug(`%cβTorrent:${item.infoHash != null ? 'torrent ' : 'torrent ' + item._torrent.name + ':file '}${item.name}${item.infoHash != null ? ' (' + item.infoHash + ')' : ''} %c${string}`, 'color: #33C3F0', `color: ${color}`)
    } else {
      return console.debug(`%cβTorrent:client %c${string}`, 'color: #33C3F0', `color: ${color}`)
    }
  }
}

const er = function (err, item) { dbg(err, item, '#FF0000') }

dbg(`Starting... v${VERSION}`)

const client = new WebTorrent({
  tracker: trackerOpts
})

const app = angular.module('BTorrent',
  ['ngRoute', 'ui.grid', 'ui.grid.resizeColumns', 'ui.grid.selection', 'ngFileUpload', 'ngNotify'],
  ['$compileProvider', '$locationProvider', '$routeProvider', function ($compileProvider, $locationProvider, $routeProvider) {
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|magnet|blob|javascript):/)
    $locationProvider.html5Mode({
      enabled: true,
      requireBase: false
    }).hashPrefix('#')
    $routeProvider.when('/view', {
      templateUrl: 'views/view.html',
      controller: 'ViewCtrl'
    }).when('/download', {
      templateUrl: 'views/download.html',
      controller: 'DownloadCtrl'
    }).otherwise({
      templateUrl: 'views/full.html',
      controller: 'FullCtrl'
    })
  }]
)

app.controller('BTorrentCtrl', ['$scope', '$rootScope', '$http', '$log', '$location', 'ngNotify', function ($scope, $rootScope, $http, $log, $location, ngNotify) {
  let updateAll
  $rootScope.version = VERSION
  ngNotify.config({
    duration: 5000,
    html: true
  })
  if (WebTorrent.WEBRTC_SUPPORT == null) {
    $rootScope.disabled = true
    ngNotify.set('Navegador sem suporte a WebRTC. Seguro, mas não faz torrent =(', {
      type: 'error',
      sticky: true,
      button: false
    })
  }
  $rootScope.client = client
  updateAll = function () {
    if ($rootScope.client.processing) {
      return
    }
    $rootScope.$apply()
  }
  setInterval(updateAll, 500)
  $rootScope.seedFiles = function (files) {
    let name
    if ((files != null) && files.length > 0) {
      if (files.length === 1) {
        dbg(`Seeding file ${files[0].name}`)
      } else {
        dbg(`Seeding ${files.length} files`)
        name = prompt('Diga o nome do torrent', 'Meu Arquivo Torrent') || 'Meu Arquivo Torrent'
        torrentOpts.name = name
      }
      $rootScope.client.processing = true
      $rootScope.client.seed(files, torrentOpts, $rootScope.onSeed)
      delete torrentOpts.name
    }
  }
  $rootScope.openTorrentFile = function (file) {
    if (file != null) {
      dbg(`Adding torrent file ${file.name}`)
      $rootScope.client.processing = true
      $rootScope.client.add(file, torrentOpts, $rootScope.onTorrent)
    }
  }
  $rootScope.client.on('error', function (err, torrent) {
    $rootScope.client.processing = false
    ngNotify.set(err, 'error')
    er(err, torrent)
  })
  $rootScope.addMagnet = function (magnet, onTorrent) {
    if ((magnet != null) && magnet.length > 0) {
      dbg(`Adding magnet/hash ${magnet}`)
      $rootScope.client.processing = true
      $rootScope.client.add(magnet, torrentOpts, onTorrent || $rootScope.onTorrent)
    }
  }
  $rootScope.destroyedTorrent = function (err) {
    if (err) {
      throw err
    }
    dbg('Torrent destruído', $rootScope.selectedTorrent)
    $rootScope.selectedTorrent = null
    $rootScope.client.processing = false
  }
  $rootScope.changePriority = function (file) {
    if (file.priority === '-1') {
      dbg('Deselecionado', file)
      file.deselect()
    } else {
      dbg(`Selected with priority ${file.priority}`, file)
      file.select(file.priority)
    }
  }
  $rootScope.onTorrent = function (torrent, isSeed) {
    dbg(torrent.magnetURI)
    torrent.safeTorrentFileURL = torrent.torrentFileBlobURL
    torrent.fileName = `${torrent.name}.torrent`
    if (!isSeed) {
      dbg('Recebendo metadados', torrent)
      ngNotify.set(`Received ${torrent.name} metadata`)
      if (!($rootScope.selectedTorrent != null)) {
        $rootScope.selectedTorrent = torrent
      }
      $rootScope.client.processing = false
    }
    torrent.files.forEach(function (file) {
      file.getBlobURL(function (err, url) {
        if (err) {
          throw err
        }
        if (isSeed) {
          dbg('Envio iniciado (seeding)', torrent)
          if (!($rootScope.selectedTorrent != null)) {
            $rootScope.selectedTorrent = torrent
          }
          $rootScope.client.processing = false
        }
        file.url = url
        if (!isSeed) {
          dbg('Concluído ', file)
          ngNotify.set(`<b>${file.name}</b> pronto para download`, 'success')
        }
      })
    })
    torrent.on('done', function () {
      if (!isSeed) {
        dbg('Concluído', torrent)
      }
      ngNotify.set(`<b>${torrent.name}</b> terminou de baixar`, 'success')
    })
    torrent.on('wire', function (wire, addr) { dbg(`Wire ${addr}`, torrent) })
    torrent.on('error', er)
  }
  $rootScope.onSeed = function (torrent) { $rootScope.onTorrent(torrent, true) }
  dbg('Pronto')
}
])

app.controller('FullCtrl', ['$scope', '$rootScope', '$http', '$log', '$location', 'ngNotify', function ($scope, $rootScope, $http, $log, $location, ngNotify) {
  ngNotify.config({
    duration: 5000,
    html: true
  })
  $scope.addMagnet = function () {
    $rootScope.addMagnet($scope.torrentInput)
    $scope.torrentInput = ''
  }
  $scope.columns = [
    {
      field: 'name',
      cellTooltip: true,
      minWidth: '200'
    }, {
      field: 'length',
      name: 'Tamanho',
      cellFilter: 'pbytes',
      width: '80'
    }, {
      field: 'received',
      displayName: 'Baixado',
      cellFilter: 'pbytes',
      width: '135'
    }, {
      field: 'downloadSpeed',
      displayName: '↓ Velocidade de download',
      cellFilter: 'pbytes:1',
      width: '100'
    }, {
      field: 'progress',
      displayName: 'Progresso',
      cellFilter: 'progress',
      width: '100'
    }, {
      field: 'timeRemaining',
      displayName: 'Tempo restante',
      cellFilter: 'humanTime',
      width: '140'
    }, {
      field: 'uploaded',
      displayName: 'Enviado',
      cellFilter: 'pbytes',
      width: '125'
    }, {
      field: 'uploadSpeed',
      displayName: '↑ Velocidade de upload',
      cellFilter: 'pbytes:1',
      width: '100'
    }, {
      field: 'numPeers',
      displayName: 'Peers',
      width: '80'
    }, {
      field: 'ratio',
      cellFilter: 'number:2',
      width: '80'
    }
  ]
  $scope.gridOptions = {
    columnDefs: $scope.columns,
    data: $rootScope.client.torrents,
    enableColumnResizing: true,
    enableColumnMenus: false,
    enableRowSelection: true,
    enableRowHeaderSelection: false,
    multiSelect: false
  }
  $scope.gridOptions.onRegisterApi = function (gridApi) {
    $scope.gridApi = gridApi
    gridApi.selection.on.rowSelectionChanged($scope, function (row) {
      if (!row.isSelected && ($rootScope.selectedTorrent != null) && ($rootScope.selectedTorrent.infoHash = row.entity.infoHash)) {
        $rootScope.selectedTorrent = null
      } else {
        $rootScope.selectedTorrent = row.entity
      }
    })
  }
  if ($location.hash() !== '') {
    $rootScope.client.processing = true
    setTimeout(function () {
      dbg(`Adding ${$location.hash()}`)
      $rootScope.addMagnet($location.hash())
    }, 0)
  }
}
])

app.controller('DownloadCtrl', ['$scope', '$rootScope', '$http', '$log', '$location', 'ngNotify', function ($scope, $rootScope, $http, $log, $location, ngNotify) {
  ngNotify.config({
    duration: 5000,
    html: true
  })
  $scope.addMagnet = function () {
    $rootScope.addMagnet($scope.torrentInput)
    $scope.torrentInput = ''
  }
  if ($location.hash() !== '') {
    $rootScope.client.processing = true
    setTimeout(function () {
      dbg(`Adding ${$location.hash()}`)
      $rootScope.addMagnet($location.hash())
    }, 0)
  }
}
])

app.controller('ViewCtrl', ['$scope', '$rootScope', '$http', '$log', '$location', 'ngNotify', function ($scope, $rootScope, $http, $log, $location, ngNotify) {
  let onTorrent
  ngNotify.config({
    duration: 2000,
    html: true
  })
  onTorrent = function (torrent) {
    $rootScope.viewerStyle = {
      'margin-top': '-20px',
      'text-align': 'center'
    }
    dbg(torrent.magnetURI)
    torrent.safeTorrentFileURL = torrent.torrentFileBlobURL
    torrent.fileName = `${torrent.name}.torrent`
    $rootScope.selectedTorrent = torrent
    $rootScope.client.processing = false
    dbg('Recebidos metadados', torrent)
    ngNotify.set(`Received ${torrent.name} metadata`)
    torrent.files.forEach(function (file) {
      file.appendTo('#viewer')
      file.getBlobURL(function (err, url) {
        if (err) {
          throw err
        }
        file.url = url
        dbg('Concluído ', file)
      })
    })
    torrent.on('done', function () { dbg('Concluído', torrent) })
    torrent.on('wire', function (wire, addr) { dbg(`Wire ${addr}`, torrent) })
    torrent.on('error', er)
  }
  $scope.addMagnet = function () {
    $rootScope.addMagnet($scope.torrentInput, onTorrent)
    $scope.torrentInput = ''
  }
  if ($location.hash() !== '') {
    $rootScope.client.processing = true
    setTimeout(function () {
      dbg(`Adding ${$location.hash()}`)
      $rootScope.addMagnet($location.hash(), onTorrent)
    }, 0)
  }
}
])

app.filter('html', [
  '$sce', function ($sce) {
    return function (input) {
      $sce.trustAsHtml(input)
    }
  }
])

app.filter('pbytes', function () {
  return function (num, speed) {
    let exponent, unit, units
    if (isNaN(num)) {
      return ''
    }
    units = ['B', 'kB', 'MB', 'GB', 'TB']
    if (num < 1) {
      return (speed ? '' : '0 B')
    }
    exponent = Math.min(Math.floor(Math.log(num) / 6.907755278982137), 8)
    num = (num / Math.pow(1000, exponent)).toFixed(1) * 1
    unit = units[exponent]
    return `${num} ${unit}${speed ? '/s' : ''}`
  }
})

app.filter('humanTime', function () {
  return function (millis) {
    let remaining
    if (millis < 1000) {
      return ''
    }
    remaining = moment.duration(millis).humanize()
    return remaining[0].toUpperCase() + remaining.substr(1)
  }
})

app.filter('progress', function () { return function (num) { `${(100 * num).toFixed(1)}%` } })
