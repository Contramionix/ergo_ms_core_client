export const cmsEndpoints = {
    auth: {
        login: 'cms/adp/authorization/',
        validateRegistration: 'cms/adp/validate-registration/',
        sendCode: 'cms/adp/send-code/',
        verifyCode: 'cms/adp/verify-code/',
        resetPassword: 'cms/adp/reset-password/',
        registration: 'cms/adp/registration/',
        protected: 'cms/adp/protected/',
        changePassword: 'cms/adp/change-password/',
        devices: 'cms/adp/devices/',
        deleteDevice: id => `cms/adp/devices/${id}/`,
        profile: 'cms/adp/profile/',
        securitySettings: 'cms/adp/security-settings/',
    },
    cms: {
        checkAccessToPage: 'cms/check_access_to_page/',
        checkAccessToComponent: 'cms/check_access_to_component/',
        checkAccessToAdminPanel: 'cms/check_access_to_admin_panel/',

        addGroupCategory: 'cms/post_group_category/',
        changeGroupCategory: 'cms/change_group_category/',
        deleteGroupCategory: 'cms/delete_group_category/',
        getGroupCategories: 'cms/get_group_categories/',

        addGroup: 'cms/add_group/',
        deleteGroup: 'cms/delete_group/',
        getGroups: 'cms/get_groups/',
        changeGroup: 'cms/change_group/',

        addPermission: 'cms/add_permission/',
        deletePermission: 'cms/delete_permission/',
        changePermission: 'cms/change_permission/',
        getPermissions: 'cms/get_permissions/',

        addUserPermission: 'cms/add_user_permission/',
        removeUserPermission: 'cms/remove_user_permission/',
        addUserGroup: 'cms/add_user_group/',
        removeUserGroup: 'cms/remove_user_group/',
        getUserGroupsAndPermissions: 'cms/get_user_groups_and_permissions/',
        getUserGroups: 'cms/get_user_groups/',
        getUserPermissions: 'cms/get_user_permissions/',

        addGroupsPermissions: 'cms/add_groups_permissions/',
        removeGroupsPermissions: 'cms/remove_groups_permissions/',
        getPermissionsByCategory: 'cms/get_permissions_by_category/',
        getUserName: 'cms/get_user_name/',
        getpages: 'cms/get-cms-pages',
        putpages: 'cms/put-cms-pages',
        getClosedPages: 'cms/get-closed-pages/',
        getClosedPagesForUser: 'cms/get-closed-pages-for-user/',

        addPageComponent: 'cms/add-page-component/',
        removePageComponent: 'cms/remove-page-component/',
        updatePageComponent: 'cms/update-page-component/',
        getPageComponents: 'cms/get-page-components/',

        roles: {
            list: 'cms/adp/roles/',
            detail: 'cms/adp/roles/'
        },
        roleGroups: {
            list: 'cms/adp/role-groups/',
            detail: 'cms/adp/role-groups/'
        },
        policies: {
            list: 'cms/adp/policies/',
            detail: 'cms/adp/policies/'
        },
        modulePermissions: 'cms/adp/module-permissions/',
        assignRole: 'cms/adp/assign-role/',
        adminUsers: 'cms/adp/admin-users/',
        myPermissions: 'cms/adp/my-permissions/',
        checkURLAccess: 'cms/adp/check-url-access/',
        
        // Menu Management
        menu: {
            userMenu: 'cms/adp/menu/',
            items: 'cms/adp/menu/items/',
            itemDetail: (id) => `cms/adp/menu/items/${id}/`,
            reorder: 'cms/adp/menu/items/reorder/',
            separators: 'cms/adp/menu/separators/',
            separatorDetail: (id) => `cms/adp/menu/separators/${id}/`,
            accessLog: 'cms/adp/menu/access-log/',
            availableIcons: 'cms/adp/menu/available-icons/'
        }
    }
};

