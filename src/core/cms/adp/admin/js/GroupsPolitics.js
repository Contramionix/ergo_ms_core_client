import { CheckAccess } from '../../../js/cms';

export const CheckAccessToAdminPanel = async () => {
    const response = await CheckAccess.CheckAccesToAdminPanel();
    return response.data;
};

export const GetPages = async () => {
    const response = await CheckAccess.GetPages();
    return response.data;
};

export const GetRoles = async () => {
    const response = await CheckAccess.GetRoles();
    return response.data;
};

export const CreateRole = async (payload) => {
    const response = await CheckAccess.CreateRole(payload);
    return response.data;
};

export const UpdateRole = async (roleId, payload) => {
    const response = await CheckAccess.UpdateRole(roleId, payload);
    return response.data;
};

export const DeleteRole = async (roleId) => {
    const response = await CheckAccess.DeleteRole(roleId);
    return response.data;
};

export const GetRoleGroups = async () => {
    const response = await CheckAccess.GetRoleGroups();
    return response.data;
};

export const GetRoleGroupOptions = async () => {
    const response = await CheckAccess.GetRoleGroupOptions();
    return response.data;
};

export const CreateRoleGroup = async (payload) => {
    const response = await CheckAccess.CreateRoleGroup(payload);
    return response.data;
};

export const UpdateRoleGroup = async (groupId, payload) => {
    const response = await CheckAccess.UpdateRoleGroup(groupId, payload);
    return response.data;
};

export const DeleteRoleGroup = async (groupId) => {
    const response = await CheckAccess.DeleteRoleGroup(groupId);
    return response.data;
};

export const GetPolicies = async () => {
    const response = await CheckAccess.GetPolicies();
    return response.data;
};

export const CreatePolicy = async (payload) => {
    const response = await CheckAccess.CreatePolicy(payload);
    return response.data;
};

export const UpdatePolicy = async (policyId, payload) => {
    const response = await CheckAccess.UpdatePolicy(policyId, payload);
    return response.data;
};

export const DeletePolicy = async (policyId) => {
    const response = await CheckAccess.DeletePolicy(policyId);
    return response.data;
};

export const AssignRoleToUser = async (payload) => {
    const response = await CheckAccess.AssignRoleToUser(payload);
    return response.data;
};

export const GetAdminUsers = async (params = {}) => {
    const response = await CheckAccess.GetAdminUsers(params);
    return response.data;
};

export {
    fetchAdminUser,
    updateAdminUser,
    deleteAdminUser,
    uploadAdminUserAvatar,
    deleteAdminUserAvatar,
    mapAdminUserToFormData,
    validateAdminProfileData,
    resetAdminUserPassword,
} from './adminUserService.js';

export const GetModulePermissions = async (roleGroupId = null) => {
    const response = await CheckAccess.GetModulePermissions(roleGroupId);
    return response.data;
};

export const CreateModulePermission = async (payload) => {
    const response = await CheckAccess.CreateModulePermission(payload);
    return response.data;
};

export const UpdateModulePermission = async (permissionId, payload) => {
    const response = await CheckAccess.UpdateModulePermission(permissionId, payload);
    return response.data;
};

export const DeleteModulePermission = async (permissionId) => {
    const response = await CheckAccess.DeleteModulePermission(permissionId);
    return response.data;
};
