export default {
  "BI": {
    "path": "/bi",
    "component": "@/core/bi/MainPage/HomePageBI.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "DashboardPage": {
    "path": "/bi/dashboard/:id(\\d+)?",
    "component": "@/core/bi/Dashboards/DashboardPage.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "NewDashboard": {
    "path": "/bi/dashboard/new",
    "component": "@/core/bi/Dashboards/DashboardPage.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "Datasets": {
    "path": "/bi/datasets/",
    "component": "@/core/bi/Datasets/Datasets.vue",
    "meta": {
      "title": "Датасеты",
      "requiresAuth": true
    }
  },
  "DatasetPage": {
    "path": "/bi/datasets/:id(\\d+)/:tab(sources|fields|parameters|filters|analysis)?",
    "component": "@/core/bi/Datasets/DatasetPage.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "NewDataset": {
    "path": "/bi/datasets/new/:tab(sources|fields|parameters|filters|analysis)?",
    "component": "@/core/bi/Datasets/DatasetPage.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "Connections": {
    "path": "/bi/connections/",
    "component": "@/core/bi/Connections/Connections.vue",
    "meta": {
      "title": "Подключения",
      "requiresAuth": true
    }
  },
  "Charts": {
    "path": "/bi/charts/",
    "component": "@/core/bi/Charts/Charts.vue",
    "meta": {
      "title": "Чарты",
      "requiresAuth": true
    }
  },
  "NewFile": {
    "path": "/bi/connections/new/file",
    "component": "@/core/bi/Connections/Files/NewFile.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "ClickHouse": {
    "path": "/bi/connections/new/clickhouse",
    "component": "@/core/bi/Connections/components/db-settings/ClickHouse.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "MSSQL": {
    "path": "/bi/connections/new/mssql",
    "component": "@/core/bi/Connections/components/db-settings/MSSQL.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "PostgreSQL": {
    "path": "/bi/connections/new/postgresql",
    "component": "@/core/bi/Connections/components/db-settings/PostgreSQL.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "ConnectionDetail": {
    "path": "/bi/connections/:pk",
    "component": "@/core/bi/Connections/components/db-settings/ConnectionDetail.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "ConnectionFiles": {
    "path": "/bi/connections/:pk/files",
    "component": "@/core/bi/Connections/Files/ConnectionFiles.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "NewConnection": {
    "path": "/bi/connections/new",
    "component": "@/core/bi/Connections/NewConnection.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "NewChart": {
    "path": "/bi/chart/new",
    "component": "@/core/bi/Charts/ChartPage.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "ChartPage": {
    "path": "/bi/chart/:id",
    "component": "@/core/bi/Charts/ChartPage.vue",
    "meta": {
      "requiresAuth": true
    }
  }
}

