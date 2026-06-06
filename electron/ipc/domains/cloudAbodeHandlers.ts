import { ipcMain } from 'electron'
import type { CaCatalogListParams, CaCheckoutInput } from '../../../src/shared/types/cloud-abode'
import type { AppServices } from '../types'

export function registerCloudAbodeHandlers(services: AppServices): void {
  ipcMain.handle('cloud-abode:getDashboard', () => services.cloudAbode?.getDashboard() ?? null)
  ipcMain.handle('cloud-abode:listLedger', (_e, limit?: number) =>
    services.cloudAbode?.listLedger(limit) ?? []
  )
  ipcMain.handle('cloud-abode:listProducts', (_e, params?: CaCatalogListParams) =>
    services.cloudAbode?.listProducts(params) ?? []
  )
  ipcMain.handle('cloud-abode:getProduct', (_e, id: string) =>
    services.cloudAbode?.getProduct(id) ?? null
  )
  ipcMain.handle('cloud-abode:isProductOwned', (_e, productId: string) =>
    services.cloudAbode?.isProductOwned(productId) ?? false
  )
  ipcMain.handle('cloud-abode:ownsVehicleSlug', (_e, slug: string) =>
    services.cloudAbode?.ownsVehicleSlug(slug) ?? false
  )
  ipcMain.handle('cloud-abode:listInventory', () => services.cloudAbode?.listInventory() ?? [])
  ipcMain.handle('cloud-abode:listCards', () => services.cloudAbode?.listCards() ?? [])
  ipcMain.handle(
    'cloud-abode:addCard',
    (_e, input: { cardNumber: string; alias: string }) => services.cloudAbode!.addCard(input)
  )
  ipcMain.handle('cloud-abode:setDefaultCard', (_e, cardId: string) => {
    services.cloudAbode?.setDefaultCard(cardId)
  })
  ipcMain.handle('cloud-abode:hasPaymentPassword', () =>
    services.cloudAbode?.hasPaymentPassword() ?? false
  )
  ipcMain.handle('cloud-abode:setPaymentPassword', (_e, password: string) => {
    services.cloudAbode?.setPaymentPassword(password)
  })
  ipcMain.handle('cloud-abode:checkout', (_e, input: CaCheckoutInput) =>
    services.cloudAbode!.checkout(input)
  )
  ipcMain.handle('cloud-abode:listTodos', () => services.cloudAbode?.listTodos() ?? [])
  ipcMain.handle('cloud-abode:ensureDailyTodos', () => {
    services.cloudAbode?.ensureDailyTodos()
  })
  ipcMain.handle(
    'cloud-abode:createUserTodo',
    (
      _e,
      input: {
        title: string
        description?: string
        priority: 'high' | 'medium' | 'low'
        dueDate?: string | null
        rewardCents: number
      }
    ) => services.cloudAbode!.createUserTodo(input)
  )
  ipcMain.handle('cloud-abode:completeTodo', (_e, todoId: string) =>
    services.cloudAbode!.completeTodo(todoId)
  )
  ipcMain.handle('cloud-abode:listTools', () => services.cloudAbode?.listTools() ?? [])
  ipcMain.handle('cloud-abode:getToolRewardStatus', (_e, toolId: string) =>
    services.cloudAbode!.getToolRewardStatus(toolId)
  )
  ipcMain.handle('cloud-abode:invokeTool', (_e, toolId: string) =>
    services.cloudAbode!.invokeTool(toolId)
  )
  ipcMain.handle(
    'cloud-abode:saveVehicleCustomization',
    (_e, slug: string, lifeJson: Record<string, unknown>) => {
      services.cloudAbode?.saveVehicleCustomization(slug, lifeJson)
    }
  )
  ipcMain.handle('cloud-abode:getVehicleCustomization', (_e, slug: string) =>
    services.cloudAbode?.getVehicleCustomization(slug) ?? null
  )
}
