import { dataStore } from "../../infrastructure/data-store";
import { NotFoundError, ValidationError } from "../../libs/common/errors";
import { MenuItem, Restaurant } from "../../libs/common/types";

export interface UpdateMenuStockInput {
  menuItemId: string;
  delta: number;
}

export class CatalogService {
  listRestaurants(): Restaurant[] {
    return Array.from(dataStore.restaurants.values());
  }

  getRestaurant(restaurantId: string): Restaurant {
    const restaurant = dataStore.restaurants.get(restaurantId);
    if (!restaurant) {
      throw new NotFoundError("Restaurant", { restaurantId });
    }
    return restaurant;
  }

  listMenuItems(restaurantId: string): MenuItem[] {
    return Array.from(dataStore.menuItems.values()).filter(
      (item) => item.restaurantId === restaurantId,
    );
  }

  getMenuItem(menuItemId: string): MenuItem {
    const menu = dataStore.menuItems.get(menuItemId);
    if (!menu) {
      throw new NotFoundError("Menu item", { menuItemId });
    }
    return menu;
  }

  updateStock(input: UpdateMenuStockInput): MenuItem {
    const menu = this.getMenuItem(input.menuItemId);
    const newStock = menu.stock + input.delta;
    if (newStock < 0) {
      throw new ValidationError("Stock cannot be negative", { menuItemId: menu.id });
    }
    menu.stock = newStock;
    dataStore.menuItems.set(menu.id, menu);
    return menu;
  }
}
