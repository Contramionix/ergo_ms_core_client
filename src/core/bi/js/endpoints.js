export const biEndpoints = {
    bi: {
        DatasetsList: 'bi_analysis/bi_datasets/',
        ConnectionsList: 'bi_analysis/bi_connections/',
        CheckConnection: 'bi_analysis/bi_connections/check-connection/',
        ChartsList: 'bi_analysis/bi_charts/',
        DashboardList: 'bi_analysis/bi_dashboards/',
        ChartsColumns: id => `bi_analysis/bi_charts/${id}/columns/`,
        ChartsRows: id => `bi_analysis/bi_charts/${id}/rows/`,
        Upload: 'bi_analysis/bi_datasets/upload/',
        UploadedFiles: 'bi_analysis/bi_datasets/user-files/',
        
        // Connections
        connectionDetail: id => `bi_analysis/bi_connections/${id}/`,
        connectionFiles: id => `bi_analysis/bi_datasets/connection/${id}/files/`,
        connectionTables: id => `bi_analysis/bi_connections/${id}/tables/`,
        
        // Datasets
        datasetDetail: id => `bi_analysis/bi_datasets/${id}/`,
        datasetPreview: id => `bi_analysis/bi_datasets/${id}/preview/`,
        datasetPreviewTaskStatus: 'bi_analysis/bi_datasets/preview/task-status/',
        datasetRenameColumns: id => `bi_analysis/bi_datasets/${id}/rename_columns/`,
        datasetAutoJoin: id => `bi_analysis/bi_datasets/${id}/auto-join/`,
        datasetAddTable: id => `bi_analysis/bi_datasets/${id}/add-table/`,
        datasetAddRelation: id => `bi_analysis/bi_datasets/${id}/add-relation/`,
        datasetRemoveRelation: id => `bi_analysis/bi_datasets/${id}/remove-relation/`,
        datasetFieldValues: (datasetId, fieldId) => `bi_analysis/bi_datasets/${datasetId}/field-values/${fieldId}/`,
        
        // Tables and Fields
        tables: 'bi_analysis/bi_datasets/tables/',
        fields: 'bi_analysis/bi_datasets/fields/',
        
        // Upload operations
        uploadFinalize: 'bi_analysis/bi_datasets/upload/finalize/',
        uploadDelete: id => `bi_analysis/bi_datasets/upload/${id}/`,
        xlsxSheets: 'bi_analysis/bi_datasets/xlsx/sheets/',
        
        // Create operations
        createFromTable: 'bi_analysis/bi_datasets/create-from-table/',
        joinTable: 'bi_analysis/bi_datasets/join-table/',
        draftPreview: 'bi_analysis/bi_datasets/draft_preview/',
        
        // Chart operations
        chart: {
            checkAccess: (chartId) => `bi_analysis/bi_charts/${chartId}/`,
            get: (chartId) => `bi_analysis/bi_charts/${chartId}/`,
        },
    }
};

