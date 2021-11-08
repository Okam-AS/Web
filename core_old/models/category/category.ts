import { ImageSource, ImageCarouselItem, CategoryProductListItem, ProductVariant } from '../index'

export class Category {
    id: string;
    orderIndex: number;
    name: string;
    image: ImageSource;

    published: boolean;

    imageCarouselEnabled: boolean;
    imageCarouselItems: Array<ImageCarouselItem>;

    categoryProductListEnabled: boolean;
    categoryProductListItems: Array<CategoryProductListItem>;

    productVariantEnabled: boolean;
    productVariants: Array<ProductVariant>;

    storeId: number;
}