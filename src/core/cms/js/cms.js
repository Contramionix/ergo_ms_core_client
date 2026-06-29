import { apiClient } from '../../../js/api/manager';
import { mediaApiClient } from '@/js/api/media-api-client.js';
import { cmsEndpoints as endpoints } from '@/core/cms/js/endpoints.js';

export const CheckAccess = {
    async CheckAccesToPage(path) {
        const response = await apiClient.get(endpoints.cms.checkAccessToPage, {
            path,
        }, true);
        return response;
    },
    async CheckAccesToComponent(path, componentId) {
        const response = await apiClient.get(endpoints.cms.checkAccessToComponent, {
            path,
            componentId,
        }, true);
        return response;
    },
    async CheckAccesToAdminPanel() {
        const response = await apiClient.get(endpoints.cms.checkAccessToAdminPanel, {}, true);
        return response;
    },
    async AddGroupCategory(name, createGroup) {
        const response = await apiClient.post(endpoints.cms.addGroupCategory, {
            category_name: name,
            create_admin_group: createGroup,
        }, true);
        return response;
    },
    async ChangeGroupCategory(name, newName) {
        const response = await apiClient.put(endpoints.cms.changeGroupCategory, {
            category_name: name,
            new_category_name: newName,
        }, true);
        return response;
    },
    async DeleteGroupCategory(name) {
        const response = await apiClient.delete(`${endpoints.cms.deleteGroupCategory}${name}/`,
            {
                data: { category_name: name }
            },
            true);
        return response;
    },
    async GetGroupCategories() {
        const response = await apiClient.get(endpoints.cms.getGroupCategories, {}, true);
        return response;
    },
    async GetGroups() {
        const response = await apiClient.get(endpoints.cms.getGroups, {}, true);
        return response;
    },
    async AddGroup(name, category, level) {
        const response = await apiClient.post(endpoints.cms.addGroup, {
            group_name: name,
            category_name: category,
            level: level,
        }, true);
        return response;
    },
    async DeleteGroup(id) {
        const response = await apiClient.delete(`${endpoints.cms.deleteGroup}${id}/`, {}, true);
        return response;
    },
    async ChangeGroup(name, newName, category, level) {
        const response = await apiClient.put(endpoints.cms.changeGroup, {
            group_name: name,
            new_group_name: newName,
            category_name: category,
            level: level,
        }, true);
        return response;
    },

    async AddPermission(name, category, accession_type, path, component_id) {
        const response = await apiClient.post(endpoints.cms.addPermission, {
            permission_name: name,
            category_name: category,
            accession_type: accession_type,
            path: path,
            component_id: component_id,
        }, true);
        return response;
    },
    async DeletePermission(id) {
        const response = await apiClient.delete(`${endpoints.cms.deletePermission}${id}/`, {}, true);
        return response;
    },
    async ChangePermission(id, newName, newCategory, accession_type, path, component_id) {
        const response = await apiClient.put(endpoints.cms.changePermission, {
            permission_id: id,
            new_permission_name: newName,
            new_category_name: newCategory,
            accession_type: accession_type,
            path: path,
            component_id: component_id,
        }, true);
        return response;
    },
    async GetPermissions() {
        const response = await apiClient.get(endpoints.cms.getPermissions, {}, true);
        return response;
    },





    async AddUserPermission(username, permissionName) {
        const response = await apiClient.post(endpoints.cms.addUserPermission, {
            username: username,
            permissions_name: permissionName,
        }, true);
        return response;
    },
    async RemoveUserPermissions(user_id, permissionName) {
        const response = await apiClient.post(endpoints.cms.removeUserPermission, {
            user_id: user_id,
            permissions_name: permissionName,
        }, true);
        return response;
    },
    async AddUserGroups(username, groupName) {
        const response = await apiClient.post(endpoints.cms.addUserGroup, {
            username: username,
            groups_name: groupName,
        }, true);
        return response;
    },
    async RemoveUserGroups(user_id, groupName) {
        const response = await apiClient.post(endpoints.cms.removeUserGroup, {
            user_id: user_id,
            groups_name: groupName,
        }, true);
        return response;
    },
    async GetUserGroupsAndPermissions() {
        const response = await apiClient.get(endpoints.cms.getUserGroupsAndPermissions, {}, true);
        return response;
    },
    async GetUserGroups() {
        const response = await apiClient.get(endpoints.cms.getUserGroups, {}, true);
        return response;
    },
    async GetUserPermissions() {
        const response = await apiClient.get(endpoints.cms.getUserPermissions, {}, true);
        return response;
    },
    async GetPermissionsByCategory(category) {
        const response = await apiClient.get(endpoints.cms.getPermissionsByCategory, {
            category: category,
        }, true);
        return response;
    },
    async AddGroupsPermissions(groupName, permissionsName, changeothergroups) {
        const response = await apiClient.post(endpoints.cms.addGroupsPermissions, {
            group_name: groupName,
            permissions_name: permissionsName,
            change_other_groups: changeothergroups
        }, true);
        return response;
    },
    async RemoveGroupsPermissions(groupName, permissionsName, changeothergroups) {
        const response = await apiClient.post(endpoints.cms.removeGroupsPermissions, {
            group_name: groupName,
            permissions_name: permissionsName,
            change_other_groups: changeothergroups
        }, true);
        return response;
    },
    async GetUserName() {
        const response = await apiClient.get(endpoints.cms.getUserName, {}, true);
        return response;
    },
    async GetPages() {
        const response = await apiClient.get(endpoints.cms.getpages, {}, true);
        return response;
    },
    async PutPages(path, type) {
        const response = await apiClient.put(endpoints.cms.putpages, {
            path: path,
            limination_type: type
        }, true);
        return response;
    },

    async AddPageComponent(path, componentId) {
        const response = await apiClient.post(endpoints.cms.addPageComponent, {
            path: path,
            component_id: componentId
        }, true);
        return response;
    },

    async RemovePageComponent(path, componentId) {
        const response = await apiClient.delete(endpoints.cms.removePageComponent, {
            path: path,
            component_id: componentId
        }, true);
        return response;
    },

    async UpdatePageComponent(path, oldComponentId, newComponentId) {

        const response = await apiClient.put(endpoints.cms.updatePageComponent, {
            path: path,
            old_component_id: oldComponentId,
            new_component_id: newComponentId
        }, true);
        return response;
    },

    async GetPageComponents() {
        const response = await apiClient.get(endpoints.cms.getPageComponents, {}, true);
        return response;
    },

    async GetClosedPagesForUser() {
        const response = await apiClient.get(endpoints.cms.getClosedPagesForUser, {}, true);
        return response;
    },

    // ========== Новая система ролей и политик ==========

    // Управление ролями
    async GetRoles() {
        const response = await apiClient.get(endpoints.cms.roles.list, {}, true);
        return response;
    },

    async GetRole(roleId) {
        const response = await apiClient.get(`${endpoints.cms.roles.detail}${roleId}/`, {}, true);
        return response;
    },

    async CreateRole(data) {
        const response = await apiClient.post(endpoints.cms.roles.list, data, true);
        return response;
    },

    async UpdateRole(roleId, data) {
        const response = await apiClient.put(`${endpoints.cms.roles.detail}${roleId}/`, data, true);
        return response;
    },

    async DeleteRole(roleId) {
        const response = await apiClient.delete(`${endpoints.cms.roles.detail}${roleId}/`, {}, true);
        return response;
    },

    // Управление ролевыми группами
    async GetRoleGroups() {
        const response = await apiClient.get(endpoints.cms.roleGroups.list, {}, true);
        return response;
    },

    async GetRoleGroupOptions() {
        const response = await apiClient.get(endpoints.cms.roleGroups.list, { minimal: 1 }, true);
        return response;
    },

    async CreateRoleGroup(data) {
        const response = await apiClient.post(endpoints.cms.roleGroups.list, data, true);
        return response;
    },

    async UpdateRoleGroup(groupId, data) {
        const response = await apiClient.put(`${endpoints.cms.roleGroups.detail}${groupId}/`, data, true);
        return response;
    },

    async DeleteRoleGroup(groupId) {
        const response = await apiClient.delete(`${endpoints.cms.roleGroups.detail}${groupId}/`, {}, true);
        return response;
    },

    // Управление политиками
    async GetPolicies() {
        const response = await apiClient.get(endpoints.cms.policies.list, {}, true);
        return response;
    },

    async CreatePolicy(data) {
        const response = await apiClient.post(endpoints.cms.policies.list, data, true);
        return response;
    },

    async UpdatePolicy(policyId, data) {
        const response = await apiClient.put(`${endpoints.cms.policies.detail}${policyId}/`, data, true);
        return response;
    },

    async DeletePolicy(policyId) {
        const response = await apiClient.delete(`${endpoints.cms.policies.detail}${policyId}/`, {}, true);
        return response;
    },

    async GetAdminUsers(params = {}) {
        const response = await apiClient.get(endpoints.cms.adminUsers, params, true);
        return response;
    },

    async GetAdminUser(userId) {
        const response = await apiClient.get(endpoints.cms.adminUserDetail(userId), {}, true);
        return response;
    },

    async UpdateAdminUser(userId, data) {
        const response = await apiClient.put(endpoints.cms.adminUserDetail(userId), data, true);
        return response;
    },

    async DeleteAdminUser(userId) {
        const response = await apiClient.delete(endpoints.cms.adminUserDetail(userId), {}, true);
        return response;
    },

    async UploadAdminUserAvatar(userId, file) {
        const uploadResult = await mediaApiClient.upload(file, {
            targetDir: 'avatars/',
            allowedTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
            maxSize: 5 * 1024 * 1024,
        });
        const response = await apiClient.post(
            endpoints.cms.adminUserAvatar(userId),
            { image_path: uploadResult.path },
            true,
        );
        return response;
    },

    async DeleteAdminUserAvatar(userId) {
        const response = await apiClient.delete(endpoints.cms.adminUserAvatar(userId), {}, true);
        return response;
    },

    async ResetAdminUserPassword(userId, data = {}) {
        const response = await apiClient.post(endpoints.cms.adminUserResetPassword(userId), data, true);
        return response;
    },

    // Назначение ролей пользователям
    async AssignRoleToUser(data) {
        const response = await apiClient.post(endpoints.cms.assignRole, data, true);
        return response;
    },

    // Получение прав пользователя
    async GetMyPermissions() {
        const response = await apiClient.get(endpoints.cms.myPermissions, {}, true);
        return response;
    },

    async CheckURLAccess(url) {
        const response = await apiClient.get(endpoints.cms.checkURLAccess, { url }, true);
        return response;
    },

    // Управление правами модулей
    async GetModulePermissions(roleGroupId = null) {
        const params = roleGroupId ? { role_group_id: roleGroupId } : {};
        const response = await apiClient.get(endpoints.cms.modulePermissions, params, true);
        return response;
    },

    async CreateModulePermission(data) {
        const response = await apiClient.post(endpoints.cms.modulePermissions, data, true);
        return response;
    },

    async UpdateModulePermission(permissionId, data) {
        const response = await apiClient.put(`${endpoints.cms.modulePermissions}${permissionId}/`, data, true);
        return response;
    },

    async DeleteModulePermission(permissionId) {
        const response = await apiClient.delete(`${endpoints.cms.modulePermissions}${permissionId}/`, {}, true);
        return response;
    }

}
