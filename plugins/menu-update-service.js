// Local API client for the menu update flow.
//
// The endpoints are new and only the admin web uses them, so the client lives here rather
// than in the shared core submodule. It follows the same conventions core's RequestService
// uses (base URL, bearer token, client headers) and adds two things core does not offer:
// an AbortController so an analysis can be cancelled when the operator switches store, and
// upload progress for the document step.

import axios from 'axios'
import $config from '~/core/helpers/configuration'

const jsonHeaders = (init) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ClientPlatform: (init && init.clientPlatformName) || 'Unknown',
    ClientAppVersion: $config.version,
    Language: (init && init.cultureCode) || 'no'
  }
  if (init && init.bearerToken) { headers.Authorization = 'Bearer ' + init.bearerToken }
  return headers
}

// The API answers a business error with 400 and { message }. Surfacing that text is the whole
// point of the flow's error handling, so a generic "request failed" is never good enough.
const toError = (error) => {
  if (axios.isCancel && axios.isCancel(error)) {
    const cancelled = new Error('cancelled')
    cancelled.cancelled = true
    return cancelled
  }
  if (error && error.code === 'ERR_CANCELED') {
    const cancelled = new Error('cancelled')
    cancelled.cancelled = true
    return cancelled
  }

  const response = error && error.response
  const message = response && response.data && response.data.message
  const wrapped = new Error(message || (error && error.message) || 'request failed')
  wrapped.status = response && response.status
  wrapped.serverMessage = message || ''
  return wrapped
}

export class MenuUpdateService {
  constructor (coreInitializer) {
    this._init = coreInitializer
  }

  get _baseUrl () { return $config.okamApiBaseUrl }

  /**
   * Sends the uploaded PDFs and any pasted text for one store.
   * `options.signal` cancels the request, `options.onUploadProgress` reports bytes sent.
   */
  Analyze (storeId, { files = [], text = '', textLabel = '', sourceMappings = [] } = {}, options = {}) {
    const form = new FormData()
    form.append('storeId', String(storeId))
    if (text) { form.append('text', text) }
    if (textLabel) { form.append('textLabel', textLabel) }
    if (sourceMappings && sourceMappings.length) {
      form.append('sourceMappings', JSON.stringify(sourceMappings))
    }
    files.forEach(file => form.append('files', file, file.name))

    const headers = jsonHeaders(this._init)
    delete headers['Content-Type'] // let the browser set the multipart boundary

    return axios
      .post(this._baseUrl + '/ai/menu-update/analyze', form, {
        headers,
        signal: options.signal,
        onUploadProgress: options.onUploadProgress
      })
      .then(response => response.data)
      .catch((error) => { throw toError(error) })
  }

  /**
   * Re-merges documents that were already read against corrected column meanings. This calls no
   * AI provider, so correcting a column costs nothing.
   */
  Remap (storeId, { documents = [], sourceMappings = [], sourceMetadata = [], sourceMetadataToken = '' } = {}, options = {}) {
    return axios
      .post(this._baseUrl + '/ai/menu-update/remap', {
        storeId,
        documents,
        sourceMappings,
        sourceMetadata,
        sourceMetadataToken
      }, {
        headers: jsonHeaders(this._init),
        signal: options.signal
      })
      .then(response => response.data)
      .catch((error) => { throw toError(error) })
  }

  Validate (plan, options = {}) {
    return axios
      .post(this._baseUrl + '/products/menu-update/validate', plan, {
        headers: jsonHeaders(this._init),
        signal: options.signal
      })
      .then(response => response.data)
      .catch((error) => { throw toError(error) })
  }

  Apply (request, options = {}) {
    return axios
      .post(this._baseUrl + '/products/menu-update/apply', request, {
        headers: jsonHeaders(this._init),
        signal: options.signal
      })
      .then(response => response.data)
      .catch((error) => { throw toError(error) })
  }

  /**
   * Asks whether an operation committed. Used after a timeout or an unknown network result so
   * the client never repeats an apply on a guess.
   */
  GetStatus (storeId, operationId, options = {}) {
    return axios
      .get(this._baseUrl + '/products/menu-update/status/' + storeId + '/' + operationId, {
        headers: jsonHeaders(this._init),
        signal: options.signal
      })
      .then(response => response.data)
      .catch((error) => { throw toError(error) })
  }
}

export default MenuUpdateService
