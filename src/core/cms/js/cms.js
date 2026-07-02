import { apiClient } from '../../../js/api/manager';
import { mediaApiClient } from '@/js/api/media-api-client.js';
import { cmsEndpoints as endpoints } from '@/core/cms/js/endpoints.js';

export const CheckAccess = {
    async CheckAccesToAdminPanel() {
        const response = await apiClient.get(endpoints.cms.checkAccessToAdminPanel, {}, true);
        return response;
    },

    async GetPages() {
        const response = await apiClient.get(endpoints.cms.getpages, {}, true);
        return response;
    },

    async PutPages(path, type) {
        const response = await apiClient.put(endpoints.cms.putpages, {
            path: path,
            limination_type: type,
        }, true);
        return response;
    },

    async AddPageComponent(path, componentId) {
        const response = await apiClient.post(endpoints.cms.addPageComponent, {
            path: path,
            component_id: componentId,
        }, true);
        return response;
    },

    async RemovePageComponent(path, componentId) {
        const response = await apiClient.delete(endpoints.cms.removePageComponent, {
            path: path,
            component_id: componentId,
        }, true);
        return response;
    },

    async UpdatePageComponent(path, oldComponentId, newComponentId) {
        const response = await apiClient.put(endpoints.cms.updatePageComponent, {
            path: path,
            old_component_id: oldComponentId,
            new_component_id: newComponentId,
        }, true);
        return response;
    },

    async GetPageComponents() {
        const response = await apiClient.get(endpoints.cms.getPageComponents, {}, true);
        return response;
    },

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

    async CreateAdminUser(data) {
        const response = await apiClient.post(endpoints.cms.adminUsers, data, true);
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

    async AssignRoleToUser(data) {
        const response = await apiClient.post(endpoints.cms.assignRole, data, true);
        return response;
    },

    async GetMyPermissions() {
        const response = await apiClient.get(endpoints.cms.myPermissions, {}, true);
        return response;
    },

    async CheckURLAccess(url) {
        const response = await apiClient.get(endpoints.cms.checkURLAccess, { url }, true);
        return response;
    },

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
    },
};
