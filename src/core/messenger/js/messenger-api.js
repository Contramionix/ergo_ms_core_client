import { apiClient } from '@/js/api/manager'

const BASE_URL = '/messenger'

export const messengerApi = {
  getMessages(contentType, objectId) {
    return apiClient.get(`${BASE_URL}/messages/`, {
      content_type: contentType, object_id: objectId,
    })
  },

  sendMessage(contentType, objectId, text, replyToId = null) {
    const payload = {
      content_type_name: contentType,
      object_id: objectId,
      text,
      message_type: 'user',
    }
    if (replyToId) payload.reply_to = replyToId
    return apiClient.post(`${BASE_URL}/messages/`, payload)
  },

  editMessage(messageId, text) {
    return apiClient.patch(`${BASE_URL}/messages/${messageId}/`, { text })
  },

  deleteMessage(messageId) {
    return apiClient.delete(`${BASE_URL}/messages/${messageId}/`)
  },

  deleteAttachment(attachmentId) {
    return apiClient.delete(`${BASE_URL}/attachments/${attachmentId}/`)
  },

  uploadAttachment(messageId, file) {
    const formData = new FormData()
    formData.append('message', messageId)
    formData.append('file', file)
    return apiClient.upload(`${BASE_URL}/attachments/`, formData)
  },

  sendMessageWithAttachments(contentType, objectId, text, files, replyToId = null) {
    return this.sendMessage(contentType, objectId, text, replyToId).then(async (response) => {
      const message = response.data
      if (files && files.length > 0) {
        const uploads = files.map((file) => this.uploadAttachment(message.id, file))
        await Promise.all(uploads)
      }
      return this.getMessages(contentType, objectId)
    })
  },
}
