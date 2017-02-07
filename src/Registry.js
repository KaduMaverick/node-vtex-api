/* @flow */
import archiver from 'archiver'
import {createClient, createWorkspaceURL} from './baseClient'
import type {InstanceOptions} from './baseClient'
import {DefaultWorkspace} from './Workspaces'

type File = {
  path: string,
  contents: any,
}

const routes = {
  Registry: '/registry',

  App: (app: string) =>
    `${routes.Registry}/${app}`,

  AppVersion: (app: string, version: string) =>
    `${routes.App(app)}/${version}`,
}

export type RegistryInstance = {
  publishApp: (files: Array<File>, tag?: string) => any,
  listApps: (app: string) => any,
  listVersionsByApp: (app: string) => any,
  getAppManifest: (app: string, version: string) => any,
}

export default function Registry (opts: InstanceOptions): RegistryInstance {
  const client = createClient({
    ...opts,
    baseURL: createWorkspaceURL('apps', {...opts, workspace: DefaultWorkspace}),
  })

  return {
    /**
     * Sends an app as a zip file.
     * @param files An array of {path, contents}, where contents can be a String, a Buffer or a ReadableStream.
     * @return Promise
     */
    publishApp: (files: Array<File>, tag?: string) => {
      if (!(files[0] && files[0].path && files[0].contents)) {
        throw new Error('Argument files must be an array of {path, contents}, where contents can be a String, a Buffer or a ReadableStream.')
      }
      const indexOfManifest = files.findIndex(({path}) => path === 'manifest.json')
      if (indexOfManifest === -1) {
        throw new Error('No manifest.json file found in files.')
      }
      const archive = archiver('zip')
      files.forEach(({contents, path}) => archive.append(contents, {name: path}))
      archive.finalize()
      return client({
        method: 'POST',
        url: routes.Registry,
        data: archive,
        params: tag ? {tag} : {},
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      })
    },

    listApps: () => {
      return client(routes.Registry)
    },

    listVersionsByApp: (app: string) => {
      return client(routes.App(app))
    },

    getAppManifest: (app: string, version: string) => {
      return client(routes.AppVersion(app, version))
    },
  }
}
