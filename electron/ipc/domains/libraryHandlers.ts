import { ipcMain } from 'electron'
import { waitForLibraryBootstrap } from '../../services/library/pack'
import type { AppServices } from '../types'

export function registerLibraryHandlers(services: AppServices): void {
  ipcMain.handle('library:listCategories', () => {
    return services.library?.listCategories() ?? []
  })
  ipcMain.handle('library:listItems', async (_e, params: { categoryId: string; subCategoryId?: string }) => {
    await waitForLibraryBootstrap()
    return services.library?.listItems(params.categoryId, params.subCategoryId) ?? []
  })
  ipcMain.handle('library:searchItems', async (_e, params: { query: string; limit?: number }) => {
    await waitForLibraryBootstrap()
    return services.library?.searchItems(params.query, params.limit) ?? []
  })
  ipcMain.handle('library:getItem', async (_e, id: string) => {
    await waitForLibraryBootstrap()
    return services.library?.getItem(id) ?? null
  })
  ipcMain.handle('library:updateItem', (_e, item: unknown) => {
    return services.library?.updateItem(item as Parameters<NonNullable<typeof services.library>['updateItem']>[0])
  })
  ipcMain.handle('library:createItem', (_e, item: unknown) => {
    return services.library?.createItem(item as Parameters<NonNullable<typeof services.library>['createItem']>[0])
  })
  ipcMain.handle('library:uploadItemImage', (_e, params: { itemId: string; filePath: string }) => {
    if (!services.library) throw new Error('库服务未就绪')
    return services.library.uploadItemImage(params.itemId, params.filePath)
  })
}
