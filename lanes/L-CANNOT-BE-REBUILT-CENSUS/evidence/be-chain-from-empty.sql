IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [Address] (
    [AddressId] uniqueidentifier NOT NULL,
    [FullAddress] nvarchar(max) NULL,
    [ZipCode] nvarchar(max) NULL,
    [City] nvarchar(max) NULL,
    CONSTRAINT [PK_Address] PRIMARY KEY ([AddressId])
);
GO

CREATE TABLE [AspNetRoles] (
    [Id] nvarchar(450) NOT NULL,
    [Name] nvarchar(256) NULL,
    [NormalizedName] nvarchar(256) NULL,
    [ConcurrencyStamp] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [DeliveryMethods] (
    [DeliveryMethodId] uniqueidentifier NOT NULL,
    [Name] nvarchar(max) NULL,
    [Description] nvarchar(max) NULL,
    [Amount] int NOT NULL,
    [MaxDistance] int NOT NULL,
    [IsSelfPickup] bit NOT NULL,
    CONSTRAINT [PK_DeliveryMethods] PRIMARY KEY ([DeliveryMethodId])
);
GO

CREATE TABLE [Stores] (
    [StoreId] int NOT NULL IDENTITY,
    [Name] nvarchar(max) NULL,
    [LegalName] nvarchar(max) NULL,
    [VAT] bigint NOT NULL,
    [AddressId] uniqueidentifier NULL,
    [SelfCheckout] bit NOT NULL,
    [Approved] bit NOT NULL,
    [Registered] datetime2 NOT NULL,
    [BankAccountId] nvarchar(max) NULL,
    CONSTRAINT [PK_Stores] PRIMARY KEY ([StoreId]),
    CONSTRAINT [FK_Stores_Address_AddressId] FOREIGN KEY ([AddressId]) REFERENCES [Address] ([AddressId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [AspNetRoleClaims] (
    [Id] int NOT NULL IDENTITY,
    [RoleId] nvarchar(450) NOT NULL,
    [ClaimType] nvarchar(max) NULL,
    [ClaimValue] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [AspNetUsers] (
    [Id] nvarchar(450) NOT NULL,
    [UserName] nvarchar(256) NULL,
    [NormalizedUserName] nvarchar(256) NULL,
    [Email] nvarchar(256) NULL,
    [NormalizedEmail] nvarchar(256) NULL,
    [EmailConfirmed] bit NOT NULL,
    [PasswordHash] nvarchar(max) NULL,
    [SecurityStamp] nvarchar(max) NULL,
    [ConcurrencyStamp] nvarchar(max) NULL,
    [PhoneNumber] nvarchar(max) NULL,
    [PhoneNumberConfirmed] bit NOT NULL,
    [TwoFactorEnabled] bit NOT NULL,
    [LockoutEnd] datetimeoffset NULL,
    [LockoutEnabled] bit NOT NULL,
    [AccessFailedCount] int NOT NULL,
    [StripeCustomerId] nvarchar(max) NULL,
    [StoreId] int NULL,
    [StoreId1] int NULL,
    CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetUsers_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_AspNetUsers_Stores_StoreId1] FOREIGN KEY ([StoreId1]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [Carts] (
    [CartId] uniqueidentifier NOT NULL,
    [UserId] nvarchar(max) NULL,
    [StoreId] int NOT NULL,
    CONSTRAINT [PK_Carts] PRIMARY KEY ([CartId]),
    CONSTRAINT [FK_Carts_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE TABLE [OpeningHours] (
    [OpeningHourId] uniqueidentifier NOT NULL,
    [DayOfWeek] int NOT NULL,
    [OpeningTime] nvarchar(max) NULL,
    [ClosingTime] nvarchar(max) NULL,
    [Open] bit NOT NULL,
    [StoreId] int NULL,
    CONSTRAINT [PK_OpeningHours] PRIMARY KEY ([OpeningHourId]),
    CONSTRAINT [FK_OpeningHours_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE TABLE [Products] (
    [ProductId] uniqueidentifier NOT NULL,
    [Barcode] nvarchar(max) NULL,
    [Name] nvarchar(max) NULL,
    [Description] nvarchar(max) NULL,
    [Currency] nvarchar(max) NULL,
    [Amount] int NOT NULL,
    [Tax] int NOT NULL,
    [Inventory] int NULL,
    [StoreId] int NULL,
    CONSTRAINT [PK_Products] PRIMARY KEY ([ProductId]),
    CONSTRAINT [FK_Products_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [StoreDeliveryMethods] (
    [StoreDeliveryMethodId] uniqueidentifier NOT NULL,
    [IsActive] bit NOT NULL,
    [DeliveryMethodId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    CONSTRAINT [PK_StoreDeliveryMethods] PRIMARY KEY ([StoreDeliveryMethodId]),
    CONSTRAINT [FK_StoreDeliveryMethods_DeliveryMethods_DeliveryMethodId] FOREIGN KEY ([DeliveryMethodId]) REFERENCES [DeliveryMethods] ([DeliveryMethodId]) ON DELETE CASCADE,
    CONSTRAINT [FK_StoreDeliveryMethods_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE TABLE [StoreImages] (
    [StoreImageId] uniqueidentifier NOT NULL,
    [Uploaded] datetime2 NOT NULL,
    [UserId] nvarchar(max) NULL,
    [Width] int NOT NULL,
    [Height] int NOT NULL,
    [StoreId] int NULL,
    CONSTRAINT [PK_StoreImages] PRIMARY KEY ([StoreImageId]),
    CONSTRAINT [FK_StoreImages_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [AspNetUserClaims] (
    [Id] int NOT NULL IDENTITY,
    [UserId] nvarchar(450) NOT NULL,
    [ClaimType] nvarchar(max) NULL,
    [ClaimValue] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [AspNetUserLogins] (
    [LoginProvider] nvarchar(450) NOT NULL,
    [ProviderKey] nvarchar(450) NOT NULL,
    [ProviderDisplayName] nvarchar(max) NULL,
    [UserId] nvarchar(450) NOT NULL,
    CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
    CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [AspNetUserRoles] (
    [UserId] nvarchar(450) NOT NULL,
    [RoleId] nvarchar(450) NOT NULL,
    CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
    CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [AspNetUserTokens] (
    [UserId] nvarchar(450) NOT NULL,
    [LoginProvider] nvarchar(450) NOT NULL,
    [Name] nvarchar(450) NOT NULL,
    [Value] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
    CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Orders] (
    [OrderId] int NOT NULL IDENTITY,
    [Pickup] datetime2 NULL,
    [Status] nvarchar(max) NOT NULL,
    [UserId] nvarchar(450) NULL,
    [StoreId] int NOT NULL,
    [StoreLegalName] nvarchar(max) NULL,
    [StoreVAT] bigint NOT NULL,
    [StoreFullAddress] nvarchar(max) NULL,
    [StoreZipCode] nvarchar(max) NULL,
    [StoreCity] nvarchar(max) NULL,
    [DeliveryAmount] int NOT NULL,
    [IsSelfPickup] bit NOT NULL,
    [FullAddress] nvarchar(max) NULL,
    [ZipCode] nvarchar(max) NULL,
    [City] nvarchar(max) NULL,
    [Comment] nvarchar(max) NULL,
    [PaymentIntentId] nvarchar(max) NULL,
    CONSTRAINT [PK_Orders] PRIMARY KEY ([OrderId]),
    CONSTRAINT [FK_Orders_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE,
    CONSTRAINT [FK_Orders_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [CartLineItems] (
    [CartLineItemId] uniqueidentifier NOT NULL,
    [Quantity] int NOT NULL,
    [Notes] nvarchar(max) NULL,
    [ProductId] uniqueidentifier NULL,
    [CartId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_CartLineItems] PRIMARY KEY ([CartLineItemId]),
    CONSTRAINT [FK_CartLineItems_Carts_CartId] FOREIGN KEY ([CartId]) REFERENCES [Carts] ([CartId]) ON DELETE CASCADE,
    CONSTRAINT [FK_CartLineItems_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([ProductId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [ProductPositions] (
    [ProductPositionId] uniqueidentifier NOT NULL,
    [PercentX] int NOT NULL,
    [PercentY] int NOT NULL,
    [ProductId] uniqueidentifier NULL,
    [StoreImageId] uniqueidentifier NULL,
    [StoreId] int NULL,
    CONSTRAINT [PK_ProductPositions] PRIMARY KEY ([ProductPositionId]),
    CONSTRAINT [FK_ProductPositions_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([ProductId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ProductPositions_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE,
    CONSTRAINT [FK_ProductPositions_StoreImages_StoreImageId] FOREIGN KEY ([StoreImageId]) REFERENCES [StoreImages] ([StoreImageId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [OrderLineItems] (
    [OrderLineItemId] uniqueidentifier NOT NULL,
    [ProductId] uniqueidentifier NOT NULL,
    [Quantity] int NOT NULL,
    [Notes] nvarchar(max) NULL,
    [Barcode] nvarchar(max) NULL,
    [Name] nvarchar(max) NULL,
    [Description] nvarchar(max) NULL,
    [Currency] nvarchar(max) NULL,
    [Amount] int NOT NULL,
    [Tax] int NOT NULL,
    [OrderId] int NULL,
    CONSTRAINT [PK_OrderLineItems] PRIMARY KEY ([OrderLineItemId]),
    CONSTRAINT [FK_OrderLineItems_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([OrderId]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
GO

CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL;
GO

CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
GO

CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
GO

CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
GO

CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
GO

CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL;
GO

CREATE INDEX [IX_AspNetUsers_StoreId] ON [AspNetUsers] ([StoreId]);
GO

CREATE INDEX [IX_AspNetUsers_StoreId1] ON [AspNetUsers] ([StoreId1]);
GO

CREATE INDEX [IX_CartLineItems_CartId] ON [CartLineItems] ([CartId]);
GO

CREATE INDEX [IX_CartLineItems_ProductId] ON [CartLineItems] ([ProductId]);
GO

CREATE INDEX [IX_Carts_StoreId] ON [Carts] ([StoreId]);
GO

CREATE INDEX [IX_OpeningHours_StoreId] ON [OpeningHours] ([StoreId]);
GO

CREATE INDEX [IX_OrderLineItems_OrderId] ON [OrderLineItems] ([OrderId]);
GO

CREATE INDEX [IX_Orders_StoreId] ON [Orders] ([StoreId]);
GO

CREATE INDEX [IX_Orders_UserId] ON [Orders] ([UserId]);
GO

CREATE INDEX [IX_ProductPositions_ProductId] ON [ProductPositions] ([ProductId]);
GO

CREATE INDEX [IX_ProductPositions_StoreId] ON [ProductPositions] ([StoreId]);
GO

CREATE INDEX [IX_ProductPositions_StoreImageId] ON [ProductPositions] ([StoreImageId]);
GO

CREATE INDEX [IX_Products_StoreId] ON [Products] ([StoreId]);
GO

CREATE INDEX [IX_StoreDeliveryMethods_DeliveryMethodId] ON [StoreDeliveryMethods] ([DeliveryMethodId]);
GO

CREATE INDEX [IX_StoreDeliveryMethods_StoreId] ON [StoreDeliveryMethods] ([StoreId]);
GO

CREATE INDEX [IX_StoreImages_StoreId] ON [StoreImages] ([StoreId]);
GO

CREATE INDEX [IX_Stores_AddressId] ON [Stores] ([AddressId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20200915100302_Init', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [ProductPositions] DROP CONSTRAINT [FK_ProductPositions_Products_ProductId];
GO

DROP INDEX [IX_ProductPositions_ProductId] ON [ProductPositions];
GO

DECLARE @var0 sysname;
SELECT @var0 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ProductPositions]') AND [c].[name] = N'ProductId');
IF @var0 IS NOT NULL EXEC(N'ALTER TABLE [ProductPositions] DROP CONSTRAINT [' + @var0 + '];');
ALTER TABLE [ProductPositions] DROP COLUMN [ProductId];
GO

ALTER TABLE [Products] ADD [ProductPositionId] uniqueidentifier NULL;
GO

CREATE INDEX [IX_Products_ProductPositionId] ON [Products] ([ProductPositionId]);
GO

ALTER TABLE [Products] ADD CONSTRAINT [FK_Products_ProductPositions_ProductPositionId] FOREIGN KEY ([ProductPositionId]) REFERENCES [ProductPositions] ([ProductPositionId]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20201024132318_productsinpp', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [AspNetUsers] DROP CONSTRAINT [FK_AspNetUsers_Stores_StoreId];
GO

ALTER TABLE [AspNetUsers] DROP CONSTRAINT [FK_AspNetUsers_Stores_StoreId1];
GO

DROP INDEX [IX_AspNetUsers_StoreId] ON [AspNetUsers];
GO

DROP INDEX [IX_AspNetUsers_StoreId1] ON [AspNetUsers];
GO

DECLARE @var1 sysname;
SELECT @var1 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AspNetUsers]') AND [c].[name] = N'StoreId');
IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [AspNetUsers] DROP CONSTRAINT [' + @var1 + '];');
ALTER TABLE [AspNetUsers] DROP COLUMN [StoreId];
GO

DECLARE @var2 sysname;
SELECT @var2 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AspNetUsers]') AND [c].[name] = N'StoreId1');
IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [AspNetUsers] DROP CONSTRAINT [' + @var2 + '];');
ALTER TABLE [AspNetUsers] DROP COLUMN [StoreId1];
GO

CREATE TABLE [StoreAdmins] (
    [ApplicationUserId] nvarchar(450) NOT NULL,
    [StoreId] int NOT NULL,
    CONSTRAINT [PK_StoreAdmins] PRIMARY KEY ([ApplicationUserId], [StoreId]),
    CONSTRAINT [FK_StoreAdmins_AspNetUsers_ApplicationUserId] FOREIGN KEY ([ApplicationUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_StoreAdmins_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE TABLE [StoreEditors] (
    [ApplicationUserId] nvarchar(450) NOT NULL,
    [StoreId] int NOT NULL,
    CONSTRAINT [PK_StoreEditors] PRIMARY KEY ([ApplicationUserId], [StoreId]),
    CONSTRAINT [FK_StoreEditors_AspNetUsers_ApplicationUserId] FOREIGN KEY ([ApplicationUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_StoreEditors_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_StoreAdmins_StoreId] ON [StoreAdmins] ([StoreId]);
GO

CREATE INDEX [IX_StoreEditors_StoreId] ON [StoreEditors] ([StoreId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20201101151919_storeusermanytomany', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DROP TABLE [StoreDeliveryMethods];
GO

DROP TABLE [DeliveryMethods];
GO

ALTER TABLE [Stores] ADD [SelfPickUp] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

CREATE TABLE [HomeDeliveryMethods] (
    [HomeDeliveryMethodId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [MaxDistance] int NOT NULL,
    [Amount] int NOT NULL,
    [MinimumOrderPrice] int NOT NULL,
    CONSTRAINT [PK_HomeDeliveryMethods] PRIMARY KEY ([HomeDeliveryMethodId]),
    CONSTRAINT [FK_HomeDeliveryMethods_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_HomeDeliveryMethods_StoreId] ON [HomeDeliveryMethods] ([StoreId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20201128225840_HomeDelivery', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [RegularDiscount] (
    [RegularDiscountId] uniqueidentifier NOT NULL,
    [StoreId] int NULL,
    [Label] nvarchar(max) NULL,
    [Code] nvarchar(max) NULL,
    [Discount] int NOT NULL,
    [Type] nvarchar(max) NOT NULL,
    [Applicability] nvarchar(max) NOT NULL,
    [MinimumOrderAmountEnabled] bit NOT NULL,
    [MinimumOrderAmount] int NOT NULL,
    [MaximumTotalUsageCountEnabled] bit NOT NULL,
    [MaximumTotalUsageCount] int NOT NULL,
    [MaximumUsagePerCustomerCountEnabled] bit NOT NULL,
    [MaximumUsagePerCustomerCount] int NOT NULL,
    [ValidFrom] datetime2 NULL,
    [ValidTo] datetime2 NULL,
    CONSTRAINT [PK_RegularDiscount] PRIMARY KEY ([RegularDiscountId]),
    CONSTRAINT [FK_RegularDiscount_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE TABLE [DiscountProducts] (
    [RegularDiscountId] uniqueidentifier NOT NULL,
    [ProductId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_DiscountProducts] PRIMARY KEY ([RegularDiscountId], [ProductId]),
    CONSTRAINT [FK_DiscountProducts_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([ProductId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_DiscountProducts_RegularDiscount_RegularDiscountId] FOREIGN KEY ([RegularDiscountId]) REFERENCES [RegularDiscount] ([RegularDiscountId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [RegularDiscountUsage] (
    [RegularDiscountId] uniqueidentifier NOT NULL,
    [OrderId] int NOT NULL,
    CONSTRAINT [PK_RegularDiscountUsage] PRIMARY KEY ([RegularDiscountId], [OrderId]),
    CONSTRAINT [FK_RegularDiscountUsage_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([OrderId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_RegularDiscountUsage_RegularDiscount_RegularDiscountId] FOREIGN KEY ([RegularDiscountId]) REFERENCES [RegularDiscount] ([RegularDiscountId]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_DiscountProducts_ProductId] ON [DiscountProducts] ([ProductId]);
GO

CREATE INDEX [IX_RegularDiscount_StoreId] ON [RegularDiscount] ([StoreId]);
GO

CREATE INDEX [IX_RegularDiscountUsage_OrderId] ON [RegularDiscountUsage] ([OrderId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20201205115303_DiscountProducts', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [RegularDiscount] ADD [TimedEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20201206063540_DiscountTimedEnabled', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Carts] ADD [DiscountCode] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20201209213746_DiscountCodeInCart', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Carts] ADD [City] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [Comment] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [FullAddress] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [HomeDeliveryMethodId] uniqueidentifier NULL;
GO

ALTER TABLE [Carts] ADD [PaymentIntentId] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [ZipCode] nvarchar(max) NULL;
GO

CREATE INDEX [IX_Carts_HomeDeliveryMethodId] ON [Carts] ([HomeDeliveryMethodId]);
GO

ALTER TABLE [Carts] ADD CONSTRAINT [FK_Carts_HomeDeliveryMethods_HomeDeliveryMethodId] FOREIGN KEY ([HomeDeliveryMethodId]) REFERENCES [HomeDeliveryMethods] ([HomeDeliveryMethodId]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20201212014312_NewCartModel', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Carts] ADD [IsSelfPickup] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20201212211439_CartIsSelfPickup', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Orders] ADD [FinalAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Orders] ADD [ItemsAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Orders] ADD [ItemsAmountLineThrough] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Orders] ADD [OrderDiscountAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [OrderLineItems] ADD [AmountPreDiscount] int NOT NULL DEFAULT 0;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20201215162654_OrderCalculationWithDiscounts', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Orders] ADD [EstimatedProcessingEndTime] datetime2 NULL;
GO

ALTER TABLE [Orders] ADD [ProcessingStartTime] datetime2 NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20201230043053_OrderCountdown', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Products] DROP CONSTRAINT [FK_Products_ProductPositions_ProductPositionId];
GO

DROP TABLE [StoreEditors];
GO

DROP INDEX [IX_Products_ProductPositionId] ON [Products];
GO

DECLARE @var3 sysname;
SELECT @var3 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Products]') AND [c].[name] = N'ProductPositionId');
IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [Products] DROP CONSTRAINT [' + @var3 + '];');
ALTER TABLE [Products] DROP COLUMN [ProductPositionId];
GO

ALTER TABLE [Stores] ADD [StatusMessage] nvarchar(max) NULL;
GO

ALTER TABLE [Products] ADD [BarcodeEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Products] ADD [DepositAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Products] ADD [DepositEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Products] ADD [InventoryEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Orders] ADD [CanceledByStore] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Orders] ADD [Completed] datetime2 NULL;
GO

ALTER TABLE [Orders] ADD [Created] datetime2 NULL;
GO

ALTER TABLE [OrderLineItems] ADD [DepositAmount] int NOT NULL DEFAULT 0;
GO

CREATE TABLE [ProductPlacements] (
    [ProductPositionId] uniqueidentifier NOT NULL,
    [ProductId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_ProductPlacements] PRIMARY KEY ([ProductPositionId], [ProductId]),
    CONSTRAINT [FK_ProductPlacements_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([ProductId]) ON DELETE CASCADE,
    CONSTRAINT [FK_ProductPlacements_ProductPositions_ProductPositionId] FOREIGN KEY ([ProductPositionId]) REFERENCES [ProductPositions] ([ProductPositionId]) ON DELETE CASCADE
);
GO

CREATE TABLE [StoreUserSettings] (
    [ApplicationUserId] nvarchar(450) NOT NULL,
    [StoreId] int NOT NULL,
    [SendSMSOnNewOrder] bit NOT NULL,
    CONSTRAINT [PK_StoreUserSettings] PRIMARY KEY ([ApplicationUserId], [StoreId]),
    CONSTRAINT [FK_StoreUserSettings_AspNetUsers_ApplicationUserId] FOREIGN KEY ([ApplicationUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_StoreUserSettings_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_ProductPlacements_ProductId] ON [ProductPlacements] ([ProductId]);
GO

CREATE INDEX [IX_StoreUserSettings_StoreId] ON [StoreUserSettings] ([StoreId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210208174949_ProductPositionRemodel', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [CartLineItems] ADD [AddedToCart] datetime2 NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210210090305_AddedToCart', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DROP TABLE [ProductPlacements];
GO

DROP TABLE [ProductPositions];
GO

DROP TABLE [StoreImages];
GO

ALTER TABLE [Stores] ADD [ApplicationFeeAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Stores] ADD [ApplicationFeePercent] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [Stores] ADD [DeliveryEstimatedMinutes] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Stores] ADD [PickupEstimatedMinutes] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Products] ADD [OtherInformation] nvarchar(max) NULL;
GO

ALTER TABLE [Products] ADD [ProductVariantEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Orders] ADD [ApplicationFeeAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Orders] ADD [ApplicationFeePercent] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [Orders] ADD [SmsCount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Orders] ADD [SmsFee] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Orders] ADD [TotalFeeAmount] int NOT NULL DEFAULT 0;
GO

DROP INDEX [IX_OpeningHours_StoreId] ON [OpeningHours];
DECLARE @var4 sysname;
SELECT @var4 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[OpeningHours]') AND [c].[name] = N'StoreId');
IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [OpeningHours] DROP CONSTRAINT [' + @var4 + '];');
ALTER TABLE [OpeningHours] ALTER COLUMN [StoreId] int NOT NULL;
CREATE INDEX [IX_OpeningHours_StoreId] ON [OpeningHours] ([StoreId]);
GO

CREATE TABLE [Categories] (
    [CategoryId] uniqueidentifier NOT NULL,
    [OrderIndex] int NOT NULL,
    [Name] nvarchar(max) NULL,
    [StartPublish] datetime2 NULL,
    [StopPublish] datetime2 NULL,
    [ImageCarouselEnabled] bit NOT NULL,
    [CategoryProductListEnabled] bit NOT NULL,
    [StoreId] int NOT NULL,
    CONSTRAINT [PK_Categories] PRIMARY KEY ([CategoryId]),
    CONSTRAINT [FK_Categories_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE TABLE [ImageSources] (
    [ImageSourceId] uniqueidentifier NOT NULL,
    [Uploaded] datetime2 NOT NULL,
    [UploadedByUserId] nvarchar(max) NULL,
    [Width] int NOT NULL,
    [Height] int NOT NULL,
    [Filname] nvarchar(max) NULL,
    [ThumbnailFilename] nvarchar(max) NULL,
    [ContainerName] nvarchar(max) NULL,
    CONSTRAINT [PK_ImageSources] PRIMARY KEY ([ImageSourceId])
);
GO

CREATE TABLE [ProductVariants] (
    [ProductVariantId] uniqueidentifier NOT NULL,
    [OrderIndex] int NOT NULL,
    [Name] nvarchar(max) NULL,
    [MinimumSelectedOptions] int NOT NULL,
    [MaximumSelectedOptions] int NOT NULL,
    [ProductId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_ProductVariants] PRIMARY KEY ([ProductVariantId]),
    CONSTRAINT [FK_ProductVariants_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([ProductId]) ON DELETE CASCADE
);
GO

CREATE TABLE [CategoryProductListItems] (
    [CategoryProductListItemId] uniqueidentifier NOT NULL,
    [OrderIndex] int NOT NULL,
    [IsHeading] bit NOT NULL,
    [Heading] nvarchar(max) NULL,
    [ProductId] uniqueidentifier NULL,
    [CategoryId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_CategoryProductListItems] PRIMARY KEY ([CategoryProductListItemId]),
    CONSTRAINT [FK_CategoryProductListItems_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([CategoryId]) ON DELETE CASCADE,
    CONSTRAINT [FK_CategoryProductListItems_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([ProductId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [ImageCarouselItem] (
    [ImageCarouselItemId] uniqueidentifier NOT NULL,
    [OrderIndex] int NOT NULL,
    [CategoryId] uniqueidentifier NULL,
    CONSTRAINT [PK_ImageCarouselItem] PRIMARY KEY ([ImageCarouselItemId]),
    CONSTRAINT [FK_ImageCarouselItem_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([CategoryId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [CategoryImages] (
    [CategoryId] uniqueidentifier NOT NULL,
    [ImageSourceId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_CategoryImages] PRIMARY KEY ([CategoryId], [ImageSourceId]),
    CONSTRAINT [FK_CategoryImages_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([CategoryId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_CategoryImages_ImageSources_ImageSourceId] FOREIGN KEY ([ImageSourceId]) REFERENCES [ImageSources] ([ImageSourceId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [LogoImage] (
    [StoreId] int NOT NULL,
    [ImageSourceId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_LogoImage] PRIMARY KEY ([StoreId], [ImageSourceId]),
    CONSTRAINT [FK_LogoImage_ImageSources_ImageSourceId] FOREIGN KEY ([ImageSourceId]) REFERENCES [ImageSources] ([ImageSourceId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_LogoImage_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [ProductImage] (
    [ProductId] uniqueidentifier NOT NULL,
    [ImageSourceId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_ProductImage] PRIMARY KEY ([ProductId], [ImageSourceId]),
    CONSTRAINT [FK_ProductImage_ImageSources_ImageSourceId] FOREIGN KEY ([ImageSourceId]) REFERENCES [ImageSources] ([ImageSourceId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ProductImage_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([ProductId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [ProductVariantOptions] (
    [ProductVariantOptionId] uniqueidentifier NOT NULL,
    [OrderIndex] int NOT NULL,
    [Name] nvarchar(max) NULL,
    [PositiveAmount] bit NOT NULL,
    [Amount] int NOT NULL,
    [OtherInformation] nvarchar(max) NULL,
    [ProductVariantId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_ProductVariantOptions] PRIMARY KEY ([ProductVariantOptionId]),
    CONSTRAINT [FK_ProductVariantOptions_ProductVariants_ProductVariantId] FOREIGN KEY ([ProductVariantId]) REFERENCES [ProductVariants] ([ProductVariantId]) ON DELETE CASCADE
);
GO

CREATE TABLE [ImageCarouselImage] (
    [ImageCarouselItemId] uniqueidentifier NOT NULL,
    [ImageSourceId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_ImageCarouselImage] PRIMARY KEY ([ImageCarouselItemId], [ImageSourceId]),
    CONSTRAINT [FK_ImageCarouselImage_ImageCarouselItem_ImageCarouselItemId] FOREIGN KEY ([ImageCarouselItemId]) REFERENCES [ImageCarouselItem] ([ImageCarouselItemId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ImageCarouselImage_ImageSources_ImageSourceId] FOREIGN KEY ([ImageSourceId]) REFERENCES [ImageSources] ([ImageSourceId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [ImageCarouselItemMarkers] (
    [ImageCarouselItemMarkerId] uniqueidentifier NOT NULL,
    [PercentX] int NOT NULL,
    [PercentY] int NOT NULL,
    [ProductId] uniqueidentifier NOT NULL,
    [ImageCarouselItemId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_ImageCarouselItemMarkers] PRIMARY KEY ([ImageCarouselItemMarkerId]),
    CONSTRAINT [FK_ImageCarouselItemMarkers_ImageCarouselItem_ImageCarouselItemId] FOREIGN KEY ([ImageCarouselItemId]) REFERENCES [ImageCarouselItem] ([ImageCarouselItemId]) ON DELETE CASCADE,
    CONSTRAINT [FK_ImageCarouselItemMarkers_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([ProductId]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_Categories_StoreId] ON [Categories] ([StoreId]);
GO

CREATE INDEX [IX_CategoryImages_ImageSourceId] ON [CategoryImages] ([ImageSourceId]);
GO

CREATE INDEX [IX_CategoryProductListItems_CategoryId] ON [CategoryProductListItems] ([CategoryId]);
GO

CREATE INDEX [IX_CategoryProductListItems_ProductId] ON [CategoryProductListItems] ([ProductId]);
GO

CREATE INDEX [IX_ImageCarouselImage_ImageSourceId] ON [ImageCarouselImage] ([ImageSourceId]);
GO

CREATE INDEX [IX_ImageCarouselItem_CategoryId] ON [ImageCarouselItem] ([CategoryId]);
GO

CREATE INDEX [IX_ImageCarouselItemMarkers_ImageCarouselItemId] ON [ImageCarouselItemMarkers] ([ImageCarouselItemId]);
GO

CREATE INDEX [IX_ImageCarouselItemMarkers_ProductId] ON [ImageCarouselItemMarkers] ([ProductId]);
GO

CREATE INDEX [IX_LogoImage_ImageSourceId] ON [LogoImage] ([ImageSourceId]);
GO

CREATE INDEX [IX_ProductImage_ImageSourceId] ON [ProductImage] ([ImageSourceId]);
GO

CREATE INDEX [IX_ProductVariantOptions_ProductVariantId] ON [ProductVariantOptions] ([ProductVariantId]);
GO

CREATE INDEX [IX_ProductVariants_ProductId] ON [ProductVariants] ([ProductId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210310060525_Version3', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [CategoryProductListItems] DROP CONSTRAINT [FK_CategoryProductListItems_Categories_CategoryId];
GO

DECLARE @var5 sysname;
SELECT @var5 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ProductVariantOptions]') AND [c].[name] = N'Amount');
IF @var5 IS NOT NULL EXEC(N'ALTER TABLE [ProductVariantOptions] DROP CONSTRAINT [' + @var5 + '];');
ALTER TABLE [ProductVariantOptions] DROP COLUMN [Amount];
GO

ALTER TABLE [ProductVariantOptions] ADD [FractionAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [ProductVariantOptions] ADD [WholeAmount] int NOT NULL DEFAULT 0;
GO

DECLARE @var6 sysname;
SELECT @var6 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[CategoryProductListItems]') AND [c].[name] = N'CategoryId');
IF @var6 IS NOT NULL EXEC(N'ALTER TABLE [CategoryProductListItems] DROP CONSTRAINT [' + @var6 + '];');
ALTER TABLE [CategoryProductListItems] ALTER COLUMN [CategoryId] uniqueidentifier NULL;
GO

ALTER TABLE [CategoryProductListItems] ADD CONSTRAINT [FK_CategoryProductListItems_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([CategoryId]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210310091750_ProductVariationAmount', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [CategoryImages] DROP CONSTRAINT [FK_CategoryImages_Categories_CategoryId];
GO

ALTER TABLE [CategoryImages] DROP CONSTRAINT [FK_CategoryImages_ImageSources_ImageSourceId];
GO

ALTER TABLE [ImageCarouselImage] DROP CONSTRAINT [FK_ImageCarouselImage_ImageCarouselItem_ImageCarouselItemId];
GO

ALTER TABLE [ImageCarouselImage] DROP CONSTRAINT [FK_ImageCarouselImage_ImageSources_ImageSourceId];
GO

ALTER TABLE [LogoImage] DROP CONSTRAINT [FK_LogoImage_ImageSources_ImageSourceId];
GO

ALTER TABLE [LogoImage] DROP CONSTRAINT [FK_LogoImage_Stores_StoreId];
GO

ALTER TABLE [ProductImage] DROP CONSTRAINT [FK_ProductImage_ImageSources_ImageSourceId];
GO

ALTER TABLE [ProductImage] DROP CONSTRAINT [FK_ProductImage_Products_ProductId];
GO

ALTER TABLE [CategoryImages] ADD CONSTRAINT [FK_CategoryImages_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([CategoryId]) ON DELETE CASCADE;
GO

ALTER TABLE [CategoryImages] ADD CONSTRAINT [FK_CategoryImages_ImageSources_ImageSourceId] FOREIGN KEY ([ImageSourceId]) REFERENCES [ImageSources] ([ImageSourceId]) ON DELETE CASCADE;
GO

ALTER TABLE [ImageCarouselImage] ADD CONSTRAINT [FK_ImageCarouselImage_ImageCarouselItem_ImageCarouselItemId] FOREIGN KEY ([ImageCarouselItemId]) REFERENCES [ImageCarouselItem] ([ImageCarouselItemId]) ON DELETE CASCADE;
GO

ALTER TABLE [ImageCarouselImage] ADD CONSTRAINT [FK_ImageCarouselImage_ImageSources_ImageSourceId] FOREIGN KEY ([ImageSourceId]) REFERENCES [ImageSources] ([ImageSourceId]) ON DELETE CASCADE;
GO

ALTER TABLE [LogoImage] ADD CONSTRAINT [FK_LogoImage_ImageSources_ImageSourceId] FOREIGN KEY ([ImageSourceId]) REFERENCES [ImageSources] ([ImageSourceId]) ON DELETE CASCADE;
GO

ALTER TABLE [LogoImage] ADD CONSTRAINT [FK_LogoImage_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE;
GO

ALTER TABLE [ProductImage] ADD CONSTRAINT [FK_ProductImage_ImageSources_ImageSourceId] FOREIGN KEY ([ImageSourceId]) REFERENCES [ImageSources] ([ImageSourceId]) ON DELETE CASCADE;
GO

ALTER TABLE [ProductImage] ADD CONSTRAINT [FK_ProductImage_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([ProductId]) ON DELETE CASCADE;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210310100315_ImageDeletion', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [ImageCarouselItem] DROP CONSTRAINT [FK_ImageCarouselItem_Categories_CategoryId];
GO

DROP INDEX [IX_ImageCarouselItem_CategoryId] ON [ImageCarouselItem];
DECLARE @var7 sysname;
SELECT @var7 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ImageCarouselItem]') AND [c].[name] = N'CategoryId');
IF @var7 IS NOT NULL EXEC(N'ALTER TABLE [ImageCarouselItem] DROP CONSTRAINT [' + @var7 + '];');
ALTER TABLE [ImageCarouselItem] ALTER COLUMN [CategoryId] uniqueidentifier NOT NULL;
CREATE INDEX [IX_ImageCarouselItem_CategoryId] ON [ImageCarouselItem] ([CategoryId]);
GO

ALTER TABLE [ImageCarouselItem] ADD CONSTRAINT [FK_ImageCarouselItem_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([CategoryId]) ON DELETE CASCADE;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210312191832_NotNullableCategoryId', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [CategoryProductListItems] DROP CONSTRAINT [FK_CategoryProductListItems_Categories_CategoryId];
GO

DROP INDEX [IX_CategoryProductListItems_CategoryId] ON [CategoryProductListItems];
DECLARE @var8 sysname;
SELECT @var8 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[CategoryProductListItems]') AND [c].[name] = N'CategoryId');
IF @var8 IS NOT NULL EXEC(N'ALTER TABLE [CategoryProductListItems] DROP CONSTRAINT [' + @var8 + '];');
ALTER TABLE [CategoryProductListItems] ALTER COLUMN [CategoryId] uniqueidentifier NOT NULL;
CREATE INDEX [IX_CategoryProductListItems_CategoryId] ON [CategoryProductListItems] ([CategoryId]);
GO

ALTER TABLE [CategoryProductListItems] ADD CONSTRAINT [FK_CategoryProductListItems_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([CategoryId]) ON DELETE CASCADE;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210313155520_NotNullableCategoryId2', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var9 sysname;
SELECT @var9 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ProductVariantOptions]') AND [c].[name] = N'FractionAmount');
IF @var9 IS NOT NULL EXEC(N'ALTER TABLE [ProductVariantOptions] DROP CONSTRAINT [' + @var9 + '];');
ALTER TABLE [ProductVariantOptions] DROP COLUMN [FractionAmount];
GO

DECLARE @var10 sysname;
SELECT @var10 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ProductVariantOptions]') AND [c].[name] = N'WholeAmount');
IF @var10 IS NOT NULL EXEC(N'ALTER TABLE [ProductVariantOptions] DROP CONSTRAINT [' + @var10 + '];');
ALTER TABLE [ProductVariantOptions] DROP COLUMN [WholeAmount];
GO

ALTER TABLE [ProductVariantOptions] ADD [Amount] int NOT NULL DEFAULT 0;
GO

CREATE TABLE [CartLineItemProductVariantOptions] (
    [ProductVariantOptionId] uniqueidentifier NOT NULL,
    [CartLineItemId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_CartLineItemProductVariantOptions] PRIMARY KEY ([ProductVariantOptionId], [CartLineItemId]),
    CONSTRAINT [FK_CartLineItemProductVariantOptions_CartLineItems_CartLineItemId] FOREIGN KEY ([CartLineItemId]) REFERENCES [CartLineItems] ([CartLineItemId]) ON DELETE CASCADE,
    CONSTRAINT [FK_CartLineItemProductVariantOptions_ProductVariantOptions_ProductVariantOptionId] FOREIGN KEY ([ProductVariantOptionId]) REFERENCES [ProductVariantOptions] ([ProductVariantOptionId]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_CartLineItemProductVariantOptions_CartLineItemId] ON [CartLineItemProductVariantOptions] ([CartLineItemId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210318140714_SaveVariantOptionInCart', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [ProductVariantOptions] ADD [SharedProductVariantId] uniqueidentifier NULL;
GO

ALTER TABLE [Categories] ADD [SharedProductVariantEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

CREATE TABLE [OrderLineItemOptions] (
    [OrderLineItemOptionId] uniqueidentifier NOT NULL,
    [ParentName] nvarchar(max) NULL,
    [Name] nvarchar(max) NULL,
    [PositiveAmount] bit NOT NULL,
    [Amount] int NOT NULL,
    [OrderLineItemId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_OrderLineItemOptions] PRIMARY KEY ([OrderLineItemOptionId]),
    CONSTRAINT [FK_OrderLineItemOptions_OrderLineItems_OrderLineItemOptionId] FOREIGN KEY ([OrderLineItemOptionId]) REFERENCES [OrderLineItems] ([OrderLineItemId]) ON DELETE CASCADE
);
GO

CREATE TABLE [SharedProductVariants] (
    [SharedProductVariantId] uniqueidentifier NOT NULL,
    [OrderIndex] int NOT NULL,
    [Name] nvarchar(max) NULL,
    [MinimumSelectedOptions] int NOT NULL,
    [MaximumSelectedOptions] int NOT NULL,
    [CategoryId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_SharedProductVariants] PRIMARY KEY ([SharedProductVariantId]),
    CONSTRAINT [FK_SharedProductVariants_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([CategoryId]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_ProductVariantOptions_SharedProductVariantId] ON [ProductVariantOptions] ([SharedProductVariantId]);
GO

CREATE INDEX [IX_SharedProductVariants_CategoryId] ON [SharedProductVariants] ([CategoryId]);
GO

ALTER TABLE [ProductVariantOptions] ADD CONSTRAINT [FK_ProductVariantOptions_SharedProductVariants_SharedProductVariantId] FOREIGN KEY ([SharedProductVariantId]) REFERENCES [SharedProductVariants] ([SharedProductVariantId]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210321223426_SharedVariantsAndOrderLineItemOption', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [ProductVariantOptions] DROP CONSTRAINT [FK_ProductVariantOptions_SharedProductVariants_SharedProductVariantId];
GO

ALTER TABLE [ProductVariants] DROP CONSTRAINT [FK_ProductVariants_Products_ProductId];
GO

DROP TABLE [SharedProductVariants];
GO

DROP INDEX [IX_ProductVariantOptions_SharedProductVariantId] ON [ProductVariantOptions];
GO

DECLARE @var11 sysname;
SELECT @var11 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ProductVariantOptions]') AND [c].[name] = N'SharedProductVariantId');
IF @var11 IS NOT NULL EXEC(N'ALTER TABLE [ProductVariantOptions] DROP CONSTRAINT [' + @var11 + '];');
ALTER TABLE [ProductVariantOptions] DROP COLUMN [SharedProductVariantId];
GO

DECLARE @var12 sysname;
SELECT @var12 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Categories]') AND [c].[name] = N'SharedProductVariantEnabled');
IF @var12 IS NOT NULL EXEC(N'ALTER TABLE [Categories] DROP CONSTRAINT [' + @var12 + '];');
ALTER TABLE [Categories] DROP COLUMN [SharedProductVariantEnabled];
GO

DECLARE @var13 sysname;
SELECT @var13 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ProductVariants]') AND [c].[name] = N'ProductId');
IF @var13 IS NOT NULL EXEC(N'ALTER TABLE [ProductVariants] DROP CONSTRAINT [' + @var13 + '];');
ALTER TABLE [ProductVariants] ALTER COLUMN [ProductId] uniqueidentifier NULL;
GO

ALTER TABLE [ProductVariants] ADD [CategoryId] uniqueidentifier NULL;
GO

ALTER TABLE [Categories] ADD [ProductVariantEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

CREATE INDEX [IX_ProductVariants_CategoryId] ON [ProductVariants] ([CategoryId]);
GO

ALTER TABLE [ProductVariants] ADD CONSTRAINT [FK_ProductVariants_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([CategoryId]) ON DELETE NO ACTION;
GO

ALTER TABLE [ProductVariants] ADD CONSTRAINT [FK_ProductVariants_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([ProductId]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210323065734_RemodelToCategoryProductVariant', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [WarningMessage] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210323194653_WarningMessageInStore', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [OrderLineItemOptions] DROP CONSTRAINT [FK_OrderLineItemOptions_OrderLineItems_OrderLineItemOptionId];
GO

CREATE INDEX [IX_OrderLineItemOptions_OrderLineItemId] ON [OrderLineItemOptions] ([OrderLineItemId]);
GO

ALTER TABLE [OrderLineItemOptions] ADD CONSTRAINT [FK_OrderLineItemOptions_OrderLineItems_OrderLineItemId] FOREIGN KEY ([OrderLineItemId]) REFERENCES [OrderLineItems] ([OrderLineItemId]) ON DELETE CASCADE;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210323210357_OrderLineItemOptionBugfix', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Orders] ADD [IsWaiterOrder] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Orders] ADD [Platform] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [IsWaiterOrder] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [AspNetUsers] ADD [Confirmed] datetime2 NULL;
GO

ALTER TABLE [AspNetUsers] ADD [Registered] datetime2 NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210417214603_WaiterOrder', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var14 sysname;
SELECT @var14 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[HomeDeliveryMethods]') AND [c].[name] = N'MinimumOrderPrice');
IF @var14 IS NOT NULL EXEC(N'ALTER TABLE [HomeDeliveryMethods] DROP CONSTRAINT [' + @var14 + '];');
ALTER TABLE [HomeDeliveryMethods] DROP COLUMN [MinimumOrderPrice];
GO

ALTER TABLE [Stores] ADD [MinimumOrderPriceForHomeDelivery] int NOT NULL DEFAULT 0;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210502042752_HomeDeliveryMinimumOrderAmount', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [TableDelivery] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Products] ADD [TableAdditionalAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Products] ADD [TablePriceEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Products] ADD [TableTax] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Orders] ADD [DeliveryType] nvarchar(max) NOT NULL DEFAULT N'';
GO

ALTER TABLE [Orders] ADD [TableName] nvarchar(max) NULL;
GO

ALTER TABLE [OrderLineItems] ADD [TableAdditionalAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Carts] ADD [DeliveryType] nvarchar(max) NOT NULL DEFAULT N'';
GO

ALTER TABLE [Carts] ADD [TableName] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210506014956_TableDelivery', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var15 sysname;
SELECT @var15 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ProductVariantOptions]') AND [c].[name] = N'PositiveAmount');
IF @var15 IS NOT NULL EXEC(N'ALTER TABLE [ProductVariantOptions] DROP CONSTRAINT [' + @var15 + '];');
ALTER TABLE [ProductVariantOptions] DROP COLUMN [PositiveAmount];
GO

DECLARE @var16 sysname;
SELECT @var16 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[OrderLineItemOptions]') AND [c].[name] = N'PositiveAmount');
IF @var16 IS NOT NULL EXEC(N'ALTER TABLE [OrderLineItemOptions] DROP CONSTRAINT [' + @var16 + '];');
ALTER TABLE [OrderLineItemOptions] DROP COLUMN [PositiveAmount];
GO

ALTER TABLE [ProductVariantOptions] ADD [NegativeAmount] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [OrderLineItemOptions] ADD [NegativeAmount] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210507023736_NegativeAmount', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var17 sysname;
SELECT @var17 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Orders]') AND [c].[name] = N'DeliveryType');
IF @var17 IS NOT NULL EXEC(N'ALTER TABLE [Orders] DROP CONSTRAINT [' + @var17 + '];');
ALTER TABLE [Orders] DROP COLUMN [DeliveryType];
GO

DECLARE @var18 sysname;
SELECT @var18 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Carts]') AND [c].[name] = N'DeliveryType');
IF @var18 IS NOT NULL EXEC(N'ALTER TABLE [Carts] DROP CONSTRAINT [' + @var18 + '];');
ALTER TABLE [Carts] DROP COLUMN [DeliveryType];
GO

ALTER TABLE [Orders] ADD [SavedDeliveryType] nvarchar(max) NOT NULL DEFAULT N'';
GO

ALTER TABLE [Carts] ADD [SavedDeliveryType] nvarchar(max) NOT NULL DEFAULT N'';
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210507051444_SavedDeliveryType', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var19 sysname;
SELECT @var19 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Orders]') AND [c].[name] = N'SavedDeliveryType');
IF @var19 IS NOT NULL EXEC(N'ALTER TABLE [Orders] DROP CONSTRAINT [' + @var19 + '];');
ALTER TABLE [Orders] DROP COLUMN [SavedDeliveryType];
GO

DECLARE @var20 sysname;
SELECT @var20 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Carts]') AND [c].[name] = N'SavedDeliveryType');
IF @var20 IS NOT NULL EXEC(N'ALTER TABLE [Carts] DROP CONSTRAINT [' + @var20 + '];');
ALTER TABLE [Carts] DROP COLUMN [SavedDeliveryType];
GO

ALTER TABLE [Orders] ADD [DeliveryType] nvarchar(max) NOT NULL DEFAULT N'';
GO

ALTER TABLE [Carts] ADD [DeliveryType] nvarchar(max) NOT NULL DEFAULT N'';
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210508171228_DeliveryTypeMapping', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Carts] ADD [IgnoreLegecyIsSelfPickupBool] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210509000733_IgnoreLegecyIsSelfPickupBool', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Orders] ADD [TipAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Carts] ADD [TipPercent] int NOT NULL DEFAULT 0;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210509015228_TipPercent', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [PhoneNumber] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210518202149_StorePhonenumber', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [Invoices] (
    [InvoiceId] int NOT NULL IDENTITY(1000, 1),
    [InvoiceDate] datetime2 NULL,
    [InvoicePeriodFrom] datetime2 NULL,
    [InvoicePeriodTo] datetime2 NULL,
    [StoreId] int NOT NULL,
    [StoreLegalName] nvarchar(max) NULL,
    [StoreVat] bigint NOT NULL,
    [StoreFullAddress] nvarchar(max) NULL,
    [StoreZipCode] nvarchar(max) NULL,
    [StoreCity] nvarchar(max) NULL,
    CONSTRAINT [PK_Invoices] PRIMARY KEY ([InvoiceId])
);
GO

CREATE TABLE [InvoiceLines] (
    [InvoiceLineId] uniqueidentifier NOT NULL,
    [OrderId] int NOT NULL,
    [Completed] datetime2 NOT NULL,
    [DeliveryType] nvarchar(max) NOT NULL,
    [BasisAmount] int NOT NULL,
    [TaxAmount] int NOT NULL,
    [TotalAmount] int NOT NULL,
    [SmsCount] int NOT NULL,
    [SmsFee] int NOT NULL,
    [ApplicationFeeAmount] int NOT NULL,
    [ApplicationFeePercent] decimal(18,2) NOT NULL,
    [InvoiceId] int NOT NULL,
    CONSTRAINT [PK_InvoiceLines] PRIMARY KEY ([InvoiceLineId]),
    CONSTRAINT [FK_InvoiceLines_Invoices_InvoiceId] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices] ([InvoiceId]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_InvoiceLines_InvoiceId] ON [InvoiceLines] ([InvoiceId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210523032658_InvoiceModels', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [SendInvoiceToEmails] nvarchar(max) NULL;
GO

ALTER TABLE [Invoices] ADD [BankAccountId] nvarchar(max) NULL;
GO

ALTER TABLE [Invoices] ADD [PayoutAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Invoices] ADD [PayoutCreated] datetime2 NULL;
GO

ALTER TABLE [Invoices] ADD [PayoutId] nvarchar(max) NULL;
GO

ALTER TABLE [Invoices] ADD [StoreSendInvoiceToEmails] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210530222800_InvoiceFields', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var21 sysname;
SELECT @var21 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Stores]') AND [c].[name] = N'TableDelivery');
IF @var21 IS NOT NULL EXEC(N'ALTER TABLE [Stores] DROP CONSTRAINT [' + @var21 + '];');
ALTER TABLE [Stores] DROP COLUMN [TableDelivery];
GO

ALTER TABLE [Stores] ADD [HomeDeliveryEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Stores] ADD [TableDeliveryEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210603191322_TableDeliveryAndHomeDeliverySwitch', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var22 sysname;
SELECT @var22 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[InvoiceLines]') AND [c].[name] = N'TaxAmount');
IF @var22 IS NOT NULL EXEC(N'ALTER TABLE [InvoiceLines] DROP CONSTRAINT [' + @var22 + '];');
ALTER TABLE [InvoiceLines] DROP COLUMN [TaxAmount];
GO

CREATE TABLE [InvoiceLineTaxDetails] (
    [InvoiceLineTaxDetailId] uniqueidentifier NOT NULL,
    [TaxPercent] int NOT NULL,
    [TaxAmount] int NOT NULL,
    [InvoiceLineId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_InvoiceLineTaxDetails] PRIMARY KEY ([InvoiceLineTaxDetailId]),
    CONSTRAINT [FK_InvoiceLineTaxDetails_InvoiceLines_InvoiceLineId] FOREIGN KEY ([InvoiceLineId]) REFERENCES [InvoiceLines] ([InvoiceLineId]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_InvoiceLineTaxDetails_InvoiceLineId] ON [InvoiceLineTaxDetails] ([InvoiceLineId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210605033743_TaxDetailsInInvoice', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Address] ADD [Latitude] nvarchar(max) NULL;
GO

ALTER TABLE [Address] ADD [Longitude] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210627210625_StoreLocation', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Invoices] ADD [CreditInvoice] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Invoices] ADD [IsCreditNote] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Invoices] ADD [TaxMultiplier] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20210731221711_CreditNoteInvoice', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [Cultures] (
    [CultureCode] nvarchar(450) NOT NULL,
    CONSTRAINT [PK_Cultures] PRIMARY KEY ([CultureCode])
);
GO

CREATE TABLE [Translations] (
    [Key] nvarchar(450) NOT NULL,
    [CultureCode] nvarchar(450) NOT NULL,
    [TranslationId] nvarchar(max) NULL,
    [Value] nvarchar(max) NULL,
    CONSTRAINT [PK_Translations] PRIMARY KEY ([CultureCode], [Key]),
    CONSTRAINT [FK_Translations_Cultures_CultureCode] FOREIGN KEY ([CultureCode]) REFERENCES [Cultures] ([CultureCode]) ON DELETE CASCADE
);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20220108154245_Culture', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [PayInStoreEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Stores] ADD [StripeEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Stores] ADD [TipEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Stores] ADD [TipLabel] nvarchar(max) NULL;
GO

ALTER TABLE [Stores] ADD [VippsEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Orders] ADD [FriendlyOrderId] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [PaymentType] nvarchar(max) NOT NULL DEFAULT N'';
GO

ALTER TABLE [Carts] ADD [IgnoreLegecyIsWaiterOrderBool] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Carts] ADD [PaymentType] nvarchar(max) NOT NULL DEFAULT N'';
GO

ALTER TABLE [Carts] ADD [TipAmount] int NOT NULL DEFAULT 0;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20220312205446_PaymentType', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var23 sysname;
SELECT @var23 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Stores]') AND [c].[name] = N'TipEnabled');
IF @var23 IS NOT NULL EXEC(N'ALTER TABLE [Stores] DROP CONSTRAINT [' + @var23 + '];');
ALTER TABLE [Stores] DROP COLUMN [TipEnabled];
GO

DECLARE @var24 sysname;
SELECT @var24 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Stores]') AND [c].[name] = N'TipLabel');
IF @var24 IS NOT NULL EXEC(N'ALTER TABLE [Stores] DROP CONSTRAINT [' + @var24 + '];');
ALTER TABLE [Stores] DROP COLUMN [TipLabel];
GO

ALTER TABLE [Stores] ADD [TipHeading] nvarchar(max) NULL;
GO

ALTER TABLE [Stores] ADD [TipPercentEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20220313143003_TipModel', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Products] ADD [Hide] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Orders] ADD [RequestedCompletion] datetime2 NULL;
GO

ALTER TABLE [Categories] ADD [Hide] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Carts] ADD [RequestedCompletion] datetime2 NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20220320001216_RequestedCompletionAndHide', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [VippsMsn] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [VippsOrderId] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [VippsOrderId] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20220327200806_Vipps', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Carts] ADD [Created] datetime2 NULL;
GO

ALTER TABLE [Carts] ADD [Updated] datetime2 NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20220328110612_CreatedCart', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [PaymentTransaction] (
    [PaymentTransactionId] uniqueidentifier NOT NULL,
    [Created] datetime2 NOT NULL,
    [PaymentType] nvarchar(max) NOT NULL,
    [UserId] nvarchar(max) NULL,
    [StoreId] int NOT NULL,
    [CartId] uniqueidentifier NULL,
    [StripePaymentIntentId] nvarchar(max) NULL,
    [VippsOrderId] nvarchar(max) NULL,
    CONSTRAINT [PK_PaymentTransaction] PRIMARY KEY ([PaymentTransactionId])
);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20220329215011_PaymentTransaction', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [PaymentTransaction] ADD [VippsMsn] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20220329221924_VippsMsnInPaymentTransaction', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [PaymentTransaction] ADD [VippsCallbackComplete] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20220429001644_VippsCallbackComplete', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Products] ADD [CommaSeparatedHideFromDeliveryTypes] nvarchar(max) NULL;
GO

ALTER TABLE [Categories] ADD [CommaSeparatedHideFromDeliveryTypes] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20220702195824_HideFromDeliveryType', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [AllowOrdersAfterOpeningHours] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Stores] ADD [HomeDeliveryFromAddressId] uniqueidentifier NULL;
GO

CREATE INDEX [IX_Stores_HomeDeliveryFromAddressId] ON [Stores] ([HomeDeliveryFromAddressId]);
GO

ALTER TABLE [Stores] ADD CONSTRAINT [FK_Stores_Address_HomeDeliveryFromAddressId] FOREIGN KEY ([HomeDeliveryFromAddressId]) REFERENCES [Address] ([AddressId]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20220923174401_HomeDeliveryFromAddress', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [AspNetUsers] ADD [CommaSeparatedFavoriteProductIds] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20230223212723_FavoriteProduct', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [EventLogs] (
    [EventLogId] uniqueidentifier NOT NULL,
    [EventName] nvarchar(max) NULL,
    [EventValue] nvarchar(max) NULL,
    [TimeStamp] datetime2 NOT NULL,
    [LaunchId] uniqueidentifier NOT NULL,
    [ResumeId] uniqueidentifier NOT NULL,
    [DeviceMake] nvarchar(max) NULL,
    [DeviceModel] nvarchar(max) NULL,
    [Os] nvarchar(max) NULL,
    [OsVersion] nvarchar(max) NULL,
    [AppName] nvarchar(max) NULL,
    [AppVersion] nvarchar(max) NULL,
    [StackTrace] nvarchar(max) NULL,
    CONSTRAINT [PK_EventLogs] PRIMARY KEY ([EventLogId])
);
GO

CREATE TABLE [StoreTranslations] (
    [StoreTranslationId] uniqueidentifier NOT NULL,
    [EntityId] nvarchar(max) NULL,
    [EntityName] nvarchar(max) NULL,
    [EntityKey] nvarchar(max) NULL,
    [Translation] nvarchar(max) NULL,
    [CultureCode] nvarchar(max) NULL,
    [StoreId] int NOT NULL,
    CONSTRAINT [PK_StoreTranslations] PRIMARY KEY ([StoreTranslationId]),
    CONSTRAINT [FK_StoreTranslations_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_StoreTranslations_StoreId] ON [StoreTranslations] ([StoreId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20230618165506_EventLogAndStoreTranslations', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [AspNetUsers] ADD [City] nvarchar(max) NULL;
GO

ALTER TABLE [AspNetUsers] ADD [FullAddress] nvarchar(max) NULL;
GO

ALTER TABLE [AspNetUsers] ADD [ZipCode] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20230702015836_UserAddressInfo', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Carts] ADD [Platform] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20230718193803_PlatformInfoOnCart', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var25 sysname;
SELECT @var25 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EventLogs]') AND [c].[name] = N'ResumeId');
IF @var25 IS NOT NULL EXEC(N'ALTER TABLE [EventLogs] DROP CONSTRAINT [' + @var25 + '];');
ALTER TABLE [EventLogs] ALTER COLUMN [ResumeId] nvarchar(max) NULL;
GO

DECLARE @var26 sysname;
SELECT @var26 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EventLogs]') AND [c].[name] = N'LaunchId');
IF @var26 IS NOT NULL EXEC(N'ALTER TABLE [EventLogs] DROP CONSTRAINT [' + @var26 + '];');
ALTER TABLE [EventLogs] ALTER COLUMN [LaunchId] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20230718201214_changeEventIdsToString', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Invoices] ADD [SettlementId] int NULL;
GO

ALTER TABLE [Invoices] ADD [SettlementReportFileName] nvarchar(max) NULL;
GO

ALTER TABLE [Invoices] ADD [VippsMsn] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20230721113041_VippsSettlementInvoice', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Orders] ADD [NotificationHub] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Carts] ADD [NotificationHub] int NOT NULL DEFAULT 0;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20230921200701_NotificationHubInOrder', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var27 sysname;
SELECT @var27 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Orders]') AND [c].[name] = N'NotificationHub');
IF @var27 IS NOT NULL EXEC(N'ALTER TABLE [Orders] DROP CONSTRAINT [' + @var27 + '];');
ALTER TABLE [Orders] ALTER COLUMN [NotificationHub] nvarchar(max) NOT NULL;
GO

DECLARE @var28 sysname;
SELECT @var28 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Carts]') AND [c].[name] = N'NotificationHub');
IF @var28 IS NOT NULL EXEC(N'ALTER TABLE [Carts] DROP CONSTRAINT [' + @var28 + '];');
ALTER TABLE [Carts] ALTER COLUMN [NotificationHub] nvarchar(max) NOT NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20230924195829_NotificationHubEnum', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Orders] ADD [ProcessingEndTime] datetime2 NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20231112210545_NewOrdersBoard', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Orders] ADD [IsInPreorderMode] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20231115224956_IsInPreorderMode', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [GiftcardBankAccountNumber] nvarchar(max) NULL;
GO

ALTER TABLE [Stores] ADD [GiftcardEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Stores] ADD [RewardProgramId] uniqueidentifier NULL;
GO

ALTER TABLE [Products] ADD [ManualRewardAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Products] ADD [ManualRewardAmountEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [PaymentTransaction] ADD [GiftcardId] uniqueidentifier NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [GiftcardTransactionId] uniqueidentifier NULL;
GO

ALTER TABLE [Orders] ADD [GiftcardTransactionId] uniqueidentifier NULL;
GO

ALTER TABLE [Orders] ADD [RewardTransactionId] uniqueidentifier NULL;
GO

ALTER TABLE [Orders] ADD [UsedRewardAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Invoices] ADD [InvoiceFee] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Invoices] ADD [OkamPayoutCreated] datetime2 NULL;
GO

ALTER TABLE [Invoices] ADD [OkamPayoutId] int NULL;
GO

ALTER TABLE [EventLogs] ADD [ModalName] nvarchar(max) NULL;
GO

ALTER TABLE [EventLogs] ADD [PageName] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [UseReward] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

CREATE TABLE [Giftcards] (
    [GiftcardId] uniqueidentifier NOT NULL,
    [NotificationHub] nvarchar(max) NOT NULL,
    [Platform] nvarchar(max) NULL,
    [Created] datetime2 NOT NULL,
    [Completed] datetime2 NULL,
    [Status] nvarchar(max) NOT NULL,
    [PaymentType] nvarchar(max) NOT NULL,
    [BuyerUserId] nvarchar(max) NULL,
    [BuyerPhoneNumber] nvarchar(max) NULL,
    [BuyerMessageToReceiver] nvarchar(max) NULL,
    [ReceiverUserId] nvarchar(max) NULL,
    [ReceiverPhoneNumber] nvarchar(max) NULL,
    [StoreId] int NOT NULL,
    [StoreLegalName] nvarchar(max) NULL,
    [StoreVAT] bigint NOT NULL,
    [StoreFullAddress] nvarchar(max) NULL,
    [StoreZipCode] nvarchar(max) NULL,
    [StoreCity] nvarchar(max) NULL,
    [SmsCount] int NOT NULL,
    [SmsFee] int NOT NULL,
    [ApplicationFeeAmount] int NOT NULL,
    [ApplicationFeePercent] decimal(18,2) NOT NULL,
    [TotalFeeAmount] int NOT NULL,
    [PaymentIntentId] nvarchar(max) NULL,
    [VippsOrderId] nvarchar(max) NULL,
    [FinalAmount] int NOT NULL,
    [GiftcardTransactionId] uniqueidentifier NULL,
    [ApplicationUserId] nvarchar(450) NULL,
    CONSTRAINT [PK_Giftcards] PRIMARY KEY ([GiftcardId]),
    CONSTRAINT [FK_Giftcards_AspNetUsers_ApplicationUserId] FOREIGN KEY ([ApplicationUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Giftcards_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE TABLE [OkamPayouts] (
    [OkamPayoutId] int NOT NULL IDENTITY,
    [Requested] datetime2 NULL,
    [Payed] datetime2 NULL,
    [PayoutAmount] int NOT NULL,
    [StoreId] int NULL,
    [InvoiceSent] bit NOT NULL,
    [InvoiceId] int NULL,
    [StoreBankAccountNumber] nvarchar(max) NULL,
    CONSTRAINT [PK_OkamPayouts] PRIMARY KEY ([OkamPayoutId]),
    CONSTRAINT [FK_OkamPayouts_Invoices_InvoiceId] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices] ([InvoiceId]) ON DELETE SET NULL,
    CONSTRAINT [FK_OkamPayouts_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE SET NULL
);
GO

CREATE TABLE [RewardPrograms] (
    [RewardProgramId] uniqueidentifier NOT NULL,
    [Name] nvarchar(max) NULL,
    [CashbackEnabled] bit NOT NULL,
    [CutOffDaysForRewardCalculation] int NOT NULL,
    CONSTRAINT [PK_RewardPrograms] PRIMARY KEY ([RewardProgramId])
);
GO

CREATE TABLE [GiftcardTransactions] (
    [GiftcardTransactionId] uniqueidentifier NOT NULL,
    [ClientTheme] nvarchar(max) NOT NULL,
    [UserId] nvarchar(450) NULL,
    [Created] datetime2 NOT NULL,
    [Amount] int NOT NULL,
    [Type] nvarchar(max) NOT NULL,
    [GiftcardId] uniqueidentifier NULL,
    [OrderId] int NULL,
    CONSTRAINT [PK_GiftcardTransactions] PRIMARY KEY ([GiftcardTransactionId]),
    CONSTRAINT [FK_GiftcardTransactions_Giftcards_GiftcardId] FOREIGN KEY ([GiftcardId]) REFERENCES [Giftcards] ([GiftcardId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_GiftcardTransactions_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([OrderId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_GiftcardTransactions_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [RewardCashbackRanges] (
    [RewardCashbackRangeId] uniqueidentifier NOT NULL,
    [RewardProgramId] uniqueidentifier NOT NULL,
    [FromAmount] decimal(18,2) NOT NULL,
    [Percent] int NOT NULL,
    CONSTRAINT [PK_RewardCashbackRanges] PRIMARY KEY ([RewardCashbackRangeId]),
    CONSTRAINT [FK_RewardCashbackRanges_RewardPrograms_RewardProgramId] FOREIGN KEY ([RewardProgramId]) REFERENCES [RewardPrograms] ([RewardProgramId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [RewardMemberships] (
    [RewardMembershipId] uniqueidentifier NOT NULL,
    [RewardProgramId] uniqueidentifier NULL,
    [UserId] nvarchar(450) NULL,
    [NotificationHub] nvarchar(max) NOT NULL,
    [Created] datetime2 NOT NULL,
    [AcceptedOffersNotifications] datetime2 NULL,
    [AcceptedOffersNotificationsValue] bit NULL,
    [AcceptedNewsNotifications] datetime2 NULL,
    [AcceptedNewsNotificationsValue] bit NULL,
    [AcceptedRewardsTerms] datetime2 NULL,
    [AcceptedRewardsTermsValue] bit NULL,
    [CollectRewards] bit NOT NULL,
    CONSTRAINT [PK_RewardMemberships] PRIMARY KEY ([RewardMembershipId]),
    CONSTRAINT [FK_RewardMemberships_RewardPrograms_RewardProgramId] FOREIGN KEY ([RewardProgramId]) REFERENCES [RewardPrograms] ([RewardProgramId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_RewardMemberships_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [RewardTransactions] (
    [RewardTransactionId] uniqueidentifier NOT NULL,
    [Created] datetime2 NOT NULL,
    [Amount] int NOT NULL,
    [Type] nvarchar(max) NOT NULL,
    [RewardMembershipId] uniqueidentifier NULL,
    [OrderId] int NOT NULL,
    CONSTRAINT [PK_RewardTransactions] PRIMARY KEY ([RewardTransactionId]),
    CONSTRAINT [FK_RewardTransactions_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([OrderId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_RewardTransactions_RewardMemberships_RewardMembershipId] FOREIGN KEY ([RewardMembershipId]) REFERENCES [RewardMemberships] ([RewardMembershipId]) ON DELETE SET NULL
);
GO

CREATE INDEX [IX_Stores_RewardProgramId] ON [Stores] ([RewardProgramId]);
GO

CREATE INDEX [IX_Giftcards_ApplicationUserId] ON [Giftcards] ([ApplicationUserId]);
GO

CREATE INDEX [IX_Giftcards_StoreId] ON [Giftcards] ([StoreId]);
GO

CREATE UNIQUE INDEX [IX_GiftcardTransactions_GiftcardId] ON [GiftcardTransactions] ([GiftcardId]) WHERE [GiftcardId] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_GiftcardTransactions_OrderId] ON [GiftcardTransactions] ([OrderId]) WHERE [OrderId] IS NOT NULL;
GO

CREATE INDEX [IX_GiftcardTransactions_UserId] ON [GiftcardTransactions] ([UserId]);
GO

CREATE UNIQUE INDEX [IX_OkamPayouts_InvoiceId] ON [OkamPayouts] ([InvoiceId]) WHERE [InvoiceId] IS NOT NULL;
GO

CREATE INDEX [IX_OkamPayouts_StoreId] ON [OkamPayouts] ([StoreId]);
GO

CREATE INDEX [IX_RewardCashbackRanges_RewardProgramId] ON [RewardCashbackRanges] ([RewardProgramId]);
GO

CREATE INDEX [IX_RewardMemberships_RewardProgramId] ON [RewardMemberships] ([RewardProgramId]);
GO

CREATE INDEX [IX_RewardMemberships_UserId] ON [RewardMemberships] ([UserId]);
GO

CREATE UNIQUE INDEX [IX_RewardTransactions_OrderId] ON [RewardTransactions] ([OrderId]);
GO

CREATE INDEX [IX_RewardTransactions_RewardMembershipId] ON [RewardTransactions] ([RewardMembershipId]);
GO

ALTER TABLE [Stores] ADD CONSTRAINT [FK_Stores_RewardPrograms_RewardProgramId] FOREIGN KEY ([RewardProgramId]) REFERENCES [RewardPrograms] ([RewardProgramId]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20240517193802_GiftcardAndRewards', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Giftcards] DROP CONSTRAINT [FK_Giftcards_AspNetUsers_ApplicationUserId];
GO

DROP INDEX [IX_Giftcards_ApplicationUserId] ON [Giftcards];
GO

DECLARE @var29 sysname;
SELECT @var29 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Giftcards]') AND [c].[name] = N'ApplicationUserId');
IF @var29 IS NOT NULL EXEC(N'ALTER TABLE [Giftcards] DROP CONSTRAINT [' + @var29 + '];');
ALTER TABLE [Giftcards] DROP COLUMN [ApplicationUserId];
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20240528195623_GiftcardAndRewardsFix', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [RewardTransactions] DROP CONSTRAINT [FK_RewardTransactions_Orders_OrderId];
GO

DROP INDEX [IX_RewardTransactions_OrderId] ON [RewardTransactions];
GO

DECLARE @var30 sysname;
SELECT @var30 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Orders]') AND [c].[name] = N'RewardTransactionId');
IF @var30 IS NOT NULL EXEC(N'ALTER TABLE [Orders] DROP CONSTRAINT [' + @var30 + '];');
ALTER TABLE [Orders] DROP COLUMN [RewardTransactionId];
GO

CREATE INDEX [IX_RewardTransactions_OrderId] ON [RewardTransactions] ([OrderId]);
GO

ALTER TABLE [RewardTransactions] ADD CONSTRAINT [FK_RewardTransactions_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([OrderId]) ON DELETE CASCADE;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20240603204756_FixRewardOrder', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [AspNetUsers] ADD [EmailConfirmationCode] nvarchar(max) NULL;
GO

ALTER TABLE [AspNetUsers] ADD [EmailConfirmationCodeExpiry] datetime2 NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20240720235637_EmailConfirmation', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [DineHomeDeliveryEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Stores] ADD [DineHomeOutletId] nvarchar(max) NULL;
GO

ALTER TABLE [Products] ADD [DeliveryAdditionalAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Products] ADD [DeliveryPriceEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Products] ADD [DeliveryTax] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Orders] ADD [DineHomeOrderId] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Orders] ADD [DineHomeStatus] nvarchar(max) NOT NULL DEFAULT N'';
GO

ALTER TABLE [Orders] ADD [Lat] float NULL;
GO

ALTER TABLE [Orders] ADD [Lng] float NULL;
GO

ALTER TABLE [Orders] ADD [StoreDineHomeOutletId] nvarchar(max) NULL;
GO

ALTER TABLE [OrderLineItems] ADD [DeliveryAdditionalAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [HomeDeliveryMethods] ADD [IsDineHomeDelivery] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [HomeDeliveryMethods] ADD [Lat] float NULL;
GO

ALTER TABLE [HomeDeliveryMethods] ADD [Lng] float NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20240822201315_DineHome', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [RewardSummaries] (
    [RewardSummaryId] uniqueidentifier NOT NULL,
    [Name] nvarchar(max) NULL,
    [CashbackPercent] decimal(18,2) NOT NULL,
    [RewardProgramId] uniqueidentifier NOT NULL,
    [Balance] int NOT NULL,
    [SpentAmountInPeriod] int NOT NULL,
    [SpentRewardsInPeriod] int NOT NULL,
    [ReceivedRewardsInPeriod] int NOT NULL,
    [UserId] nvarchar(max) NULL,
    [UserPhoneNumber] nvarchar(max) NULL,
    CONSTRAINT [PK_RewardSummaries] PRIMARY KEY ([RewardSummaryId])
);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20240915194841_RewardSummary', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [RegularDiscount] ADD [Expired] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Invoices] ADD [RefundCount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Invoices] ADD [RefundTotalAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [InvoiceLines] ADD [DiscountAmount] int NOT NULL DEFAULT 0;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20240921205016_InvoiceAndDiscountChanges', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [RewardSummaries] ADD [OrderCountInPeriod] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [AspNetUsers] ADD [BirthDate] datetime2 NULL;
GO

ALTER TABLE [AspNetUsers] ADD [FirstName] nvarchar(max) NULL;
GO

ALTER TABLE [AspNetUsers] ADD [LastName] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20240927224904_RewardSummaryAndUserFields', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [FeedbackMessage] nvarchar(max) NULL;
GO

ALTER TABLE [Stores] ADD [FeedbackUrl] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [UserFullName] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [UserIsMember] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [AspNetUsers] ADD [ShowFeedback] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

CREATE TABLE [Feedbacks] (
    [FeedbackId] int NOT NULL IDENTITY,
    [UserId] nvarchar(max) NULL,
    [Comment] nvarchar(max) NULL,
    [Source] nvarchar(max) NULL,
    [Thumb] nvarchar(max) NULL,
    [Device] nvarchar(max) NULL,
    [AppVersion] nvarchar(max) NULL,
    [Created] datetime2 NULL,
    CONSTRAINT [PK_Feedbacks] PRIMARY KEY ([FeedbackId])
);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20241006201911_Feedbacks', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [RegularDiscount] ADD [GiveRewardInsteadOfDiscountEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20241009185640_RewardDiscount', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [RewardTransactions] DROP CONSTRAINT [FK_RewardTransactions_Orders_OrderId];
GO

DECLARE @var31 sysname;
SELECT @var31 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[RewardTransactions]') AND [c].[name] = N'OrderId');
IF @var31 IS NOT NULL EXEC(N'ALTER TABLE [RewardTransactions] DROP CONSTRAINT [' + @var31 + '];');
ALTER TABLE [RewardTransactions] ALTER COLUMN [OrderId] int NULL;
GO

ALTER TABLE [RewardTransactions] ADD CONSTRAINT [FK_RewardTransactions_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([OrderId]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20241012225500_GiveRewardToUser', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [PaymentTransaction] ADD [VippsIsCancelled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20241112232608_AddVippsIsCancelledToPaymentTransaction', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [CategoryPublishRules] (
    [CategoryPublishRuleId] uniqueidentifier NOT NULL,
    [CategoryId] uniqueidentifier NOT NULL,
    [DayOfWeek] int NOT NULL,
    [StartTimeInMinutes] int NOT NULL,
    [EndTimeInMinutes] int NOT NULL,
    CONSTRAINT [PK_CategoryPublishRules] PRIMARY KEY ([CategoryPublishRuleId]),
    CONSTRAINT [FK_CategoryPublishRules_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([CategoryId]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_CategoryPublishRules_CategoryId] ON [CategoryPublishRules] ([CategoryId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20241129221800_CategoryPublishRules', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [WoltDriveEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Stores] ADD [WoltDriveMerchantId] nvarchar(max) NULL;
GO

ALTER TABLE [Stores] ADD [WoltDriveMerchantKey] nvarchar(max) NULL;
GO

ALTER TABLE [Stores] ADD [WoltDriveVenueId] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [WoltDeliveryInfoId] uniqueidentifier NULL;
GO

ALTER TABLE [HomeDeliveryMethods] ADD [IsWoltHomeDelivery] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [HomeDeliveryMethods] ADD [WoltShipmentPromiseId] nvarchar(max) NULL;
GO

CREATE TABLE [WoltDeliveryInfos] (
    [WoltDeliveryInfoId] uniqueidentifier NOT NULL,
    [TrackingUrl] nvarchar(max) NULL,
    [WoltOrderId] nvarchar(max) NULL,
    [ShipmentPromiseId] nvarchar(max) NULL,
    [MerchantOrderReferenceId] nvarchar(max) NULL,
    [TrackingReference] nvarchar(max) NULL,
    [WoltDriveMerchantKey] nvarchar(max) NULL,
    [WoltDriveMerchantId] nvarchar(max) NULL,
    [WoltDriveVenueId] nvarchar(max) NULL,
    [Status] nvarchar(max) NOT NULL,
    [PickupEta] datetime2 NULL,
    [PriceAmount] decimal(18,2) NULL,
    [PriceCurrency] nvarchar(max) NULL,
    [OrderNumber] nvarchar(max) NULL,
    [OrderId] int NOT NULL,
    CONSTRAINT [PK_WoltDeliveryInfos] PRIMARY KEY ([WoltDeliveryInfoId]),
    CONSTRAINT [FK_WoltDeliveryInfos_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([OrderId]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [IX_WoltDeliveryInfos_OrderId] ON [WoltDeliveryInfos] ([OrderId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250214124940_WoltDrive', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [DinteroAccountId] nvarchar(max) NULL;
GO

ALTER TABLE [Stores] ADD [DinteroEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [PaymentTransaction] ADD [DinteroCallbackComplete] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [PaymentTransaction] ADD [DinteroIsCancelled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [PaymentTransaction] ADD [DinteroPaymentId] nvarchar(max) NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [DinteroSessionId] nvarchar(max) NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [DinteroStatus] nvarchar(max) NOT NULL DEFAULT N'';
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250304152912_Dintero', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var32 sysname;
SELECT @var32 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Stores]') AND [c].[name] = N'DinteroAccountId');
IF @var32 IS NOT NULL EXEC(N'ALTER TABLE [Stores] DROP CONSTRAINT [' + @var32 + '];');
ALTER TABLE [Stores] DROP COLUMN [DinteroAccountId];
GO

CREATE TABLE [DinteroStoreConfigurations] (
    [Id] int NOT NULL IDENTITY,
    [DinteroAccountId] nvarchar(max) NULL,
    [VippsEnabled] bit NOT NULL,
    [ApplePayEnabled] bit NOT NULL,
    [CreditCardEnabled] bit NOT NULL,
    [GooglePayEnabled] bit NOT NULL,
    [KlarnaEnabled] bit NOT NULL,
    [BillieEnabled] bit NOT NULL,
    [StoreId] int NOT NULL,
    CONSTRAINT [PK_DinteroStoreConfigurations] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_DinteroStoreConfigurations_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [IX_DinteroStoreConfigurations_StoreId] ON [DinteroStoreConfigurations] ([StoreId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250309132359_DinteroStoreConfiguration', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Products] ADD [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
GO

ALTER TABLE [Products] ADD [UpdatedAt] datetime2 NULL;
GO

CREATE TABLE [StoreKeyAccountManagers] (
    [Id] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [ApplicationUserId] nvarchar(450) NULL,
    [Notes] nvarchar(max) NULL,
    [Status] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_StoreKeyAccountManagers] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_StoreKeyAccountManagers_AspNetUsers_ApplicationUserId] FOREIGN KEY ([ApplicationUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_StoreKeyAccountManagers_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_StoreKeyAccountManagers_ApplicationUserId] ON [StoreKeyAccountManagers] ([ApplicationUserId]);
GO

CREATE UNIQUE INDEX [IX_StoreKeyAccountManagers_StoreId] ON [StoreKeyAccountManagers] ([StoreId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250330031006_StoreKeyAccountManager', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [DinteroStoreConfigurations] ADD [ClientId] nvarchar(max) NULL;
GO

ALTER TABLE [DinteroStoreConfigurations] ADD [ClientSecret] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250405130134_DinteroClientInfo', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

EXEC sp_rename N'[PaymentTransaction].[DinteroPaymentId]', N'DinteroTransactionId', N'COLUMN';
GO

ALTER TABLE [Orders] ADD [DinteroTransactionId] nvarchar(max) NULL;
GO

ALTER TABLE [Giftcards] ADD [DinteroTransactionId] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [DinteroTransactionId] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250406220502_DinteroPayment', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Products] DROP CONSTRAINT [FK_Products_Stores_StoreId];
GO

ALTER TABLE [AspNetUsers] ADD [IsKeyAccountDirector] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [AspNetUsers] ADD [IsKeyAccountManager] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [AspNetUsers] ADD [IsPowerUser] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [AspNetUsers] ADD [KeyAccountDirectorId] nvarchar(450) NULL;
GO

CREATE TABLE [OfferItems] (
    [OfferItemId] uniqueidentifier NOT NULL,
    [Name] nvarchar(255) NOT NULL,
    [Description] nvarchar(1000) NULL,
    [InternalDescription] nvarchar(255) NULL,
    [EnableMonthlyFee] bit NOT NULL,
    [EnableOnetimeFee] bit NOT NULL,
    [MinMonthlyFee] int NOT NULL,
    [MinOnetimeFee] int NOT NULL,
    [MaxMonthlyFee] int NOT NULL,
    [MaxOnetimeFee] int NOT NULL,
    [OnetimeBonusToSeller] int NOT NULL,
    [MonthlyBonusToSeller] int NOT NULL,
    [OneTimeBonusToSellersManager] int NOT NULL,
    [MonthlyBonusToSellersManager] int NOT NULL,
    [OnetimePercentBonusToSeller] int NOT NULL,
    [MonthlyPercentBonusToSeller] int NOT NULL,
    [OnetimePercentBonusToSellersManager] int NOT NULL,
    [MonthlyPercentBonusToSellersManager] int NOT NULL,
    [CreatedBy] uniqueidentifier NOT NULL,
    [CreatedByName] nvarchar(max) NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [UpdatedByName] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    [Inactive] bit NOT NULL,
    CONSTRAINT [PK_OfferItems] PRIMARY KEY ([OfferItemId])
);
GO

CREATE TABLE [OfferProposals] (
    [OfferProposalId] int NOT NULL IDENTITY,
    [ClientName] nvarchar(255) NULL,
    [ClientEmail] nvarchar(255) NULL,
    [ClientPhoneNumber] nvarchar(50) NULL,
    [CompanyLegalName] nvarchar(255) NULL,
    [CompanyFullAddress] nvarchar(500) NULL,
    [CompanyZipCode] nvarchar(20) NULL,
    [CompanyCity] nvarchar(100) NULL,
    [CompanyVAT] nvarchar(20) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [CreatedBy] uniqueidentifier NOT NULL,
    [UpdatedAt] datetime2 NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [Accepted] datetime2 NULL,
    [Expiration] datetime2 NULL,
    [Status] nvarchar(max) NOT NULL,
    [Notes] nvarchar(1000) NULL,
    [InternalNotes] nvarchar(1000) NULL,
    [SellerId] uniqueidentifier NULL,
    [SellerName] nvarchar(max) NULL,
    [SellersManagerId] uniqueidentifier NULL,
    [SellersManagerName] nvarchar(max) NULL,
    CONSTRAINT [PK_OfferProposals] PRIMARY KEY ([OfferProposalId])
);
GO

CREATE TABLE [OfferProposalLineItems] (
    [Id] int NOT NULL IDENTITY,
    [OfferProposalId] int NOT NULL,
    [OriginalOfferItemId] nvarchar(max) NULL,
    [Name] nvarchar(max) NULL,
    [Description] nvarchar(max) NULL,
    [InternalDescription] nvarchar(max) NULL,
    [Quantity] int NOT NULL,
    [Notes] nvarchar(max) NULL,
    [InternalNotes] nvarchar(max) NULL,
    [ShowMonthlyFee] bit NOT NULL,
    [ShowOnetimeFee] bit NOT NULL,
    [MonthlyFee] int NOT NULL,
    [OnetimeFee] int NOT NULL,
    [OnetimeBonusToSeller] int NOT NULL,
    [MonthlyBonusToSeller] int NOT NULL,
    [OneTimeBonusToSellersManager] int NOT NULL,
    [MonthlyBonusToSellersManager] int NOT NULL,
    [OfferItemId] uniqueidentifier NULL,
    CONSTRAINT [PK_OfferProposalLineItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_OfferProposalLineItems_OfferItems_OfferItemId] FOREIGN KEY ([OfferItemId]) REFERENCES [OfferItems] ([OfferItemId]),
    CONSTRAINT [FK_OfferProposalLineItems_OfferProposals_OfferProposalId] FOREIGN KEY ([OfferProposalId]) REFERENCES [OfferProposals] ([OfferProposalId]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_AspNetUsers_KeyAccountDirectorId] ON [AspNetUsers] ([KeyAccountDirectorId]);
GO

CREATE INDEX [IX_OfferProposalLineItems_OfferItemId] ON [OfferProposalLineItems] ([OfferItemId]);
GO

CREATE INDEX [IX_OfferProposalLineItems_OfferProposalId] ON [OfferProposalLineItems] ([OfferProposalId]);
GO

ALTER TABLE [AspNetUsers] ADD CONSTRAINT [FK_AspNetUsers_AspNetUsers_KeyAccountDirectorId] FOREIGN KEY ([KeyAccountDirectorId]) REFERENCES [AspNetUsers] ([Id]);
GO

ALTER TABLE [Products] ADD CONSTRAINT [FK_Products_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE SET NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250413204905_Offers', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [OrderLineItems] ADD [DinteroMerchantAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [OrderLineItems] ADD [DinteroPlatformAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [DinteroStoreConfigurations] ADD [CommissionPercentage] decimal(5,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [DinteroStoreConfigurations] ADD [SplitSellerId] nvarchar(max) NULL;
GO

ALTER TABLE [Categories] ADD [Slug] nvarchar(max) NULL;
GO

ALTER TABLE [Categories] ADD [SoldOut] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [CartLineItems] ADD [DinteroMerchantAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [CartLineItems] ADD [DinteroPlatformAmount] int NOT NULL DEFAULT 0;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250416183422_DinteroSplitPayment', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Orders] ADD [DinteroSessionId] nvarchar(max) NULL;
GO

ALTER TABLE [Giftcards] ADD [DinteroSessionId] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [DinteroSessionId] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250419143515_DinteroSessionIds', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var33 sysname;
SELECT @var33 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[PaymentTransaction]') AND [c].[name] = N'DinteroStatus');
IF @var33 IS NOT NULL EXEC(N'ALTER TABLE [PaymentTransaction] DROP CONSTRAINT [' + @var33 + '];');
ALTER TABLE [PaymentTransaction] DROP COLUMN [DinteroStatus];
GO

DECLARE @var34 sysname;
SELECT @var34 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[CartLineItems]') AND [c].[name] = N'DinteroMerchantAmount');
IF @var34 IS NOT NULL EXEC(N'ALTER TABLE [CartLineItems] DROP CONSTRAINT [' + @var34 + '];');
ALTER TABLE [CartLineItems] DROP COLUMN [DinteroMerchantAmount];
GO

DECLARE @var35 sysname;
SELECT @var35 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[CartLineItems]') AND [c].[name] = N'DinteroPlatformAmount');
IF @var35 IS NOT NULL EXEC(N'ALTER TABLE [CartLineItems] DROP CONSTRAINT [' + @var35 + '];');
ALTER TABLE [CartLineItems] DROP COLUMN [DinteroPlatformAmount];
GO

ALTER TABLE [Stores] ADD [ContactEmails] nvarchar(max) NULL;
GO

ALTER TABLE [Stores] ADD [WoltCustomerDeliveryFeeAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Stores] ADD [WoltServiceFeeAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Orders] ADD [ServiceFeeAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Orders] ADD [WoltServiceFeeAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [HomeDeliveryMethods] ADD [UpdatedAt] datetime2 NULL;
GO

ALTER TABLE [DinteroStoreConfigurations] ADD [WoltDeliveryFeePercent] decimal(5,2) NOT NULL DEFAULT 0.0;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250511144020_WoltPricing', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [PayoutStoreId] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Orders] ADD [CompanyAddress] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [CompanyCity] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [CompanyEmail] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [CompanyName] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [CompanyPhone] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [CompanyVat] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [CompanyZipCode] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [OriginalStoreId] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Orders] ADD [PayoutStoreId] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Invoices] ADD [DinteroSettlementId] nvarchar(max) NULL;
GO

ALTER TABLE [DinteroStoreConfigurations] ADD [BillieMessage] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [CompanyAddress] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [CompanyCity] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [CompanyEmail] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [CompanyName] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [CompanyPhone] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [CompanyVat] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [CompanyZipCode] nvarchar(max) NULL;
GO

CREATE TABLE [AccountingConfigurations] (
    [Id] int NOT NULL IDENTITY,
    [AccountNumber0Percent] nvarchar(max) NULL,
    [AccountNumber15Percent] nvarchar(max) NULL,
    [AccountNumber25Percent] nvarchar(max) NULL,
    [AccountNumberReceivables] nvarchar(max) NULL,
    [CallbackUrl] nvarchar(max) NULL,
    [Enabled] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    [StoreId] int NULL,
    [ProductId] uniqueidentifier NULL,
    CONSTRAINT [PK_AccountingConfigurations] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AccountingConfigurations_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([ProductId]) ON DELETE CASCADE,
    CONSTRAINT [FK_AccountingConfigurations_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE TABLE [AccountingSummaries] (
    [Id] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [Date] nvarchar(max) NULL,
    [DaysTakings] int NOT NULL,
    [Description] nvarchar(max) NULL,
    [Account] nvarchar(max) NULL,
    [Amount] nvarchar(max) NULL,
    [VatCode] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [JsonPayload] nvarchar(max) NULL,
    [SendingSuccessful] bit NOT NULL,
    [ErrorMessage] nvarchar(max) NULL,
    CONSTRAINT [PK_AccountingSummaries] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AccountingSummaries_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [IX_AccountingConfigurations_ProductId] ON [AccountingConfigurations] ([ProductId]) WHERE [ProductId] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_AccountingConfigurations_StoreId] ON [AccountingConfigurations] ([StoreId]) WHERE [StoreId] IS NOT NULL;
GO

CREATE INDEX [IX_AccountingSummaries_StoreId] ON [AccountingSummaries] ([StoreId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250531164643_CompanyInfo', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [ChatHistories] (
    [Id] int NOT NULL IDENTITY,
    [StoreIds] nvarchar(max) NOT NULL,
    [Question] nvarchar(max) NOT NULL,
    [GeneratedSql] nvarchar(max) NULL,
    [Answer] nvarchar(max) NULL,
    [SqlExecutionResult] nvarchar(max) NULL,
    [Success] bit NOT NULL,
    [ErrorMessage] nvarchar(max) NULL,
    [AttemptNumber] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [HasChart] bit NOT NULL,
    [ChartConfig] nvarchar(max) NULL,
    CONSTRAINT [PK_ChatHistories] PRIMARY KEY ([Id])
);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250806223343_AIChatHistory', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Orders] ADD [DeliveryInstructions] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [DeliveryInstructions] nvarchar(max) NULL;
GO

ALTER TABLE [AspNetUsers] ADD [DeliveryInstructions] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20250824153650_DeliveryInstructions', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Orders] ADD [WoltMarketplaceOrderId] nvarchar(max) NULL;
GO

CREATE TABLE [WoltLogs] (
    [Id] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [LogType] nvarchar(50) NOT NULL,
    [EventType] nvarchar(50) NOT NULL,
    [StartedAt] datetime2 NOT NULL,
    [CompletedAt] datetime2 NULL,
    [Success] bit NOT NULL,
    [ItemCount] int NOT NULL,
    [ErrorMessage] nvarchar(max) NULL,
    [DataJson] nvarchar(max) NULL,
    [RequestBody] TEXT NULL,
    [ResponseStatus] int NULL,
    [ExternalOrderId] nvarchar(100) NULL,
    [VenueId] nvarchar(100) NULL,
    CONSTRAINT [PK_WoltLogs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_WoltLogs_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE TABLE [WoltMarketplaceConfigurations] (
    [Id] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [Enabled] bit NOT NULL,
    [VenueId] nvarchar(max) NOT NULL,
    [ClientId] nvarchar(max) NOT NULL,
    [ClientSecret] nvarchar(max) NOT NULL,
    [AccessToken] nvarchar(max) NULL,
    [RefreshToken] nvarchar(max) NULL,
    [TokenExpiry] datetime2 NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_WoltMarketplaceConfigurations] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_WoltMarketplaceConfigurations_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE TABLE [WoltMenus] (
    [Id] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [WoltMenuId] nvarchar(max) NULL,
    [Currency] nvarchar(3) NULL,
    [PrimaryLanguage] nvarchar(2) NULL,
    [Status] nvarchar(20) NULL,
    [LastSyncedAt] datetime2 NULL,
    [PendingSync] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_WoltMenus] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_WoltMenus_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE TABLE [WoltCategories] (
    [Id] int NOT NULL IDENTITY,
    [WoltMenuId] int NOT NULL,
    [WoltCategoryId] nvarchar(max) NULL,
    [NameJson] nvarchar(max) NOT NULL,
    [DescriptionJson] nvarchar(max) NULL,
    [OrderIndex] int NOT NULL,
    [PendingSync] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_WoltCategories] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_WoltCategories_WoltMenus_WoltMenuId] FOREIGN KEY ([WoltMenuId]) REFERENCES [WoltMenus] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [WoltItems] (
    [Id] int NOT NULL IDENTITY,
    [WoltCategoryId] int NOT NULL,
    [WoltItemId] nvarchar(max) NULL,
    [NameJson] nvarchar(max) NOT NULL,
    [DescriptionJson] nvarchar(max) NULL,
    [Price] int NOT NULL,
    [SalesTaxPercentage] int NOT NULL,
    [Enabled] bit NOT NULL,
    [InStock] bit NOT NULL,
    [ImageUrl] nvarchar(max) NULL,
    [ExternalData] nvarchar(max) NULL,
    [MerchantSku] nvarchar(max) NULL,
    [Gtin] nvarchar(max) NULL,
    [DepositAmount] int NULL,
    [DepositVatPercentage] int NULL,
    [DeliveryMethodsJson] nvarchar(max) NOT NULL,
    [PendingSync] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_WoltItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_WoltItems_WoltCategories_WoltCategoryId] FOREIGN KEY ([WoltCategoryId]) REFERENCES [WoltCategories] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [WoltOptions] (
    [Id] int NOT NULL IDENTITY,
    [WoltItemId] int NOT NULL,
    [WoltOptionId] nvarchar(max) NULL,
    [NameJson] nvarchar(max) NOT NULL,
    [Type] nvarchar(20) NOT NULL,
    [SelectionRangeMin] int NULL,
    [SelectionRangeMax] int NULL,
    [ExternalData] nvarchar(max) NULL,
    [PendingSync] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_WoltOptions] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_WoltOptions_WoltItems_WoltItemId] FOREIGN KEY ([WoltItemId]) REFERENCES [WoltItems] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [WoltOptionValues] (
    [Id] int NOT NULL IDENTITY,
    [WoltOptionId] int NOT NULL,
    [WoltOptionValueId] nvarchar(max) NULL,
    [NameJson] nvarchar(max) NOT NULL,
    [Price] int NOT NULL,
    [Enabled] bit NOT NULL,
    [IsDefault] bit NOT NULL,
    [ExternalData] nvarchar(max) NULL,
    [PendingSync] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_WoltOptionValues] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_WoltOptionValues_WoltOptions_WoltOptionId] FOREIGN KEY ([WoltOptionId]) REFERENCES [WoltOptions] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_WoltCategories_WoltMenuId] ON [WoltCategories] ([WoltMenuId]);
GO

CREATE INDEX [IX_WoltItems_WoltCategoryId] ON [WoltItems] ([WoltCategoryId]);
GO

CREATE INDEX [IX_WoltLogs_StoreId] ON [WoltLogs] ([StoreId]);
GO

CREATE UNIQUE INDEX [IX_WoltMarketplaceConfigurations_StoreId] ON [WoltMarketplaceConfigurations] ([StoreId]);
GO

CREATE INDEX [IX_WoltMenus_StoreId] ON [WoltMenus] ([StoreId]);
GO

CREATE INDEX [IX_WoltOptions_WoltItemId] ON [WoltOptions] ([WoltItemId]);
GO

CREATE INDEX [IX_WoltOptionValues_WoltOptionId] ON [WoltOptionValues] ([WoltOptionId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20251022213312_WoltMarketplace', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [DinteroStoreConfigurations] ADD [KraviaEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [DinteroStoreConfigurations] ADD [KraviaMessage] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260422001100_DinteroKravia', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [OpenIddictApplications] (
    [Id] nvarchar(450) NOT NULL,
    [ApplicationType] nvarchar(50) NULL,
    [ClientId] nvarchar(450) NULL,
    [ClientSecret] nvarchar(max) NULL,
    [ClientType] nvarchar(50) NULL,
    [ConcurrencyToken] nvarchar(50) NULL,
    [ConsentType] nvarchar(50) NULL,
    [DisplayName] nvarchar(max) NULL,
    [DisplayNames] nvarchar(max) NULL,
    [JsonWebKeySet] nvarchar(max) NULL,
    [Permissions] nvarchar(max) NULL,
    [PostLogoutRedirectUris] nvarchar(max) NULL,
    [Properties] nvarchar(max) NULL,
    [RedirectUris] nvarchar(max) NULL,
    [Requirements] nvarchar(max) NULL,
    [Settings] nvarchar(max) NULL,
    CONSTRAINT [PK_OpenIddictApplications] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [OpenIddictScopes] (
    [Id] nvarchar(450) NOT NULL,
    [ConcurrencyToken] nvarchar(50) NULL,
    [Description] nvarchar(max) NULL,
    [Descriptions] nvarchar(max) NULL,
    [DisplayName] nvarchar(max) NULL,
    [DisplayNames] nvarchar(max) NULL,
    [Name] nvarchar(200) NULL,
    [Properties] nvarchar(max) NULL,
    [Resources] nvarchar(max) NULL,
    CONSTRAINT [PK_OpenIddictScopes] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [OpenIddictAuthorizations] (
    [Id] nvarchar(450) NOT NULL,
    [ApplicationId] nvarchar(450) NULL,
    [ConcurrencyToken] nvarchar(50) NULL,
    [CreationDate] datetime2 NULL,
    [Properties] nvarchar(max) NULL,
    [Scopes] nvarchar(max) NULL,
    [Status] nvarchar(50) NULL,
    [Subject] nvarchar(400) NULL,
    [Type] nvarchar(50) NULL,
    CONSTRAINT [PK_OpenIddictAuthorizations] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_OpenIddictAuthorizations_OpenIddictApplications_ApplicationId] FOREIGN KEY ([ApplicationId]) REFERENCES [OpenIddictApplications] ([Id])
);
GO

CREATE TABLE [OpenIddictTokens] (
    [Id] nvarchar(450) NOT NULL,
    [ApplicationId] nvarchar(450) NULL,
    [AuthorizationId] nvarchar(450) NULL,
    [ConcurrencyToken] nvarchar(50) NULL,
    [CreationDate] datetime2 NULL,
    [ExpirationDate] datetime2 NULL,
    [Payload] nvarchar(max) NULL,
    [Properties] nvarchar(max) NULL,
    [RedemptionDate] datetime2 NULL,
    [ReferenceId] nvarchar(100) NULL,
    [Status] nvarchar(50) NULL,
    [Subject] nvarchar(400) NULL,
    [Type] nvarchar(150) NULL,
    CONSTRAINT [PK_OpenIddictTokens] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_OpenIddictTokens_OpenIddictApplications_ApplicationId] FOREIGN KEY ([ApplicationId]) REFERENCES [OpenIddictApplications] ([Id]),
    CONSTRAINT [FK_OpenIddictTokens_OpenIddictAuthorizations_AuthorizationId] FOREIGN KEY ([AuthorizationId]) REFERENCES [OpenIddictAuthorizations] ([Id])
);
GO

CREATE UNIQUE INDEX [IX_OpenIddictApplications_ClientId] ON [OpenIddictApplications] ([ClientId]) WHERE [ClientId] IS NOT NULL;
GO

CREATE INDEX [IX_OpenIddictAuthorizations_ApplicationId_Status_Subject_Type] ON [OpenIddictAuthorizations] ([ApplicationId], [Status], [Subject], [Type]);
GO

CREATE UNIQUE INDEX [IX_OpenIddictScopes_Name] ON [OpenIddictScopes] ([Name]) WHERE [Name] IS NOT NULL;
GO

CREATE INDEX [IX_OpenIddictTokens_ApplicationId_Status_Subject_Type] ON [OpenIddictTokens] ([ApplicationId], [Status], [Subject], [Type]);
GO

CREATE INDEX [IX_OpenIddictTokens_AuthorizationId] ON [OpenIddictTokens] ([AuthorizationId]);
GO

CREATE UNIQUE INDEX [IX_OpenIddictTokens_ReferenceId] ON [OpenIddictTokens] ([ReferenceId]) WHERE [ReferenceId] IS NOT NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260530233958_OpenIDdictMcpOAuth', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DROP INDEX [IX_Orders_StoreId] ON [Orders];
GO

ALTER TABLE [Stores] ADD [SmsSenderName] nvarchar(max) NULL;
GO

ALTER TABLE [Stores] ADD [SurfboardEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Stores] ADD [TableReservationEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Products] ADD [GoodsGroupId] int NULL;
GO

ALTER TABLE [Products] ADD [KitchenPrintEnabled] bit NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [CapturedAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [PaymentTransaction] ADD [CashPointId] int NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [EventIdempotencyKey] nvarchar(450) NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [JournalEntryId] bigint NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [OperatorId] int NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [OrderId] int NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [PendingRefundAmount] int NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [PendingRefundApproverOperatorId] int NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [PendingRefundApproverOperatorName] nvarchar(max) NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [PendingRefundOriginalJournalEntryId] bigint NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [RefundedAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [PaymentTransaction] ADD [SurfboardCallbackComplete] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [PaymentTransaction] ADD [SurfboardIsCancelled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [PaymentTransaction] ADD [SurfboardOrderId] nvarchar(max) NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [SurfboardPaymentId] nvarchar(max) NULL;
GO

DECLARE @var36 sysname;
SELECT @var36 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Orders]') AND [c].[name] = N'Status');
IF @var36 IS NOT NULL EXEC(N'ALTER TABLE [Orders] DROP CONSTRAINT [' + @var36 + '];');
ALTER TABLE [Orders] ALTER COLUMN [Status] nvarchar(450) NOT NULL;
GO

ALTER TABLE [Orders] ADD [CashPointId] int NULL;
GO

ALTER TABLE [Orders] ADD [Couverts] int NULL;
GO

ALTER TABLE [Orders] ADD [JournalEntryId] bigint NULL;
GO

ALTER TABLE [Orders] ADD [Kind] nvarchar(max) NOT NULL DEFAULT N'Consumer';
GO

ALTER TABLE [Orders] ADD [OperatorId] int NULL;
GO

ALTER TABLE [Orders] ADD [ReceiptNumber] bigint NULL;
GO

ALTER TABLE [Orders] ADD [ReservationId] int NULL;
GO

ALTER TABLE [Orders] ADD [SurfboardOrderId] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [SurfboardPaymentId] nvarchar(max) NULL;
GO

ALTER TABLE [Orders] ADD [TableId] int NULL;
GO

ALTER TABLE [OrderLineItems] ADD [CourseSequence] int NULL;
GO

ALTER TABLE [OrderLineItems] ADD [DiscountAmount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [OrderLineItems] ADD [DiscountReason] nvarchar(max) NULL;
GO

ALTER TABLE [OrderLineItems] ADD [DiscountReasonId] int NULL;
GO

ALTER TABLE [OrderLineItems] ADD [GoodsGroupId] int NULL;
GO

ALTER TABLE [OrderLineItems] ADD [IsOpenPrice] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [OrderLineItems] ADD [Status] nvarchar(max) NULL;
GO

ALTER TABLE [Giftcards] ADD [SurfboardOrderId] nvarchar(max) NULL;
GO

ALTER TABLE [Giftcards] ADD [SurfboardPaymentId] nvarchar(max) NULL;
GO

ALTER TABLE [DinteroStoreConfigurations] ADD [CallbackSignatureSecret] nvarchar(max) NULL;
GO

ALTER TABLE [Categories] ADD [KitchenPrintEnabled] bit NOT NULL DEFAULT CAST(1 AS bit);
GO

ALTER TABLE [Carts] ADD [SurfboardOrderId] nvarchar(max) NULL;
GO

ALTER TABLE [Carts] ADD [SurfboardPaymentId] nvarchar(max) NULL;
GO

CREATE TABLE [Allergens] (
    [AllergenId] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [Name] nvarchar(max) NULL,
    [Code] nvarchar(450) NULL,
    [SortOrder] int NOT NULL,
    [IsActive] bit NOT NULL,
    [Created] datetime2 NOT NULL,
    CONSTRAINT [PK_Allergens] PRIMARY KEY ([AllergenId]),
    CONSTRAINT [FK_Allergens_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [CashPoints] (
    [CashPointId] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [Name] nvarchar(max) NULL,
    [RegisterId] nvarchar(max) NULL,
    [DinteroStoreId] nvarchar(max) NULL,
    [DinteroTerminalId] nvarchar(max) NULL,
    [DinteroPayoutDestinationId] nvarchar(max) NULL,
    [DinteroProfileId] nvarchar(max) NULL,
    [SurfboardTerminalId] nvarchar(max) NULL,
    [SurfboardAutoPrintReceipt] bit NOT NULL,
    [IsActive] bit NOT NULL,
    [GrandTotalSales] bigint NOT NULL,
    [GrandTotalReturns] bigint NOT NULL,
    [GrandTotalNet] bigint NOT NULL,
    [GrandTotalTips] bigint NOT NULL,
    [MaxCashDifference] int NOT NULL,
    [Created] datetime2 NOT NULL,
    CONSTRAINT [PK_CashPoints] PRIMARY KEY ([CashPointId]),
    CONSTRAINT [FK_CashPoints_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [CheckSplits] (
    [CheckSplitId] uniqueidentifier NOT NULL,
    [OrderId] int NOT NULL,
    [StoreId] int NOT NULL,
    [CashPointId] int NOT NULL,
    [Mode] nvarchar(max) NOT NULL,
    [PartCount] int NOT NULL,
    [TotalAmount] int NOT NULL,
    [OperatorId] int NOT NULL,
    [Created] datetime2 NOT NULL,
    CONSTRAINT [PK_CheckSplits] PRIMARY KEY ([CheckSplitId]),
    CONSTRAINT [FK_CheckSplits_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([OrderId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [DiscountReasons] (
    [DiscountReasonId] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [Name] nvarchar(max) NULL,
    [DiscountType] nvarchar(max) NOT NULL,
    [Value] int NOT NULL,
    [StaffGroup] nvarchar(max) NULL,
    [RequiresManagerPin] bit NOT NULL,
    [SortOrder] int NOT NULL,
    [IsActive] bit NOT NULL,
    [Created] datetime2 NOT NULL,
    CONSTRAINT [PK_DiscountReasons] PRIMARY KEY ([DiscountReasonId]),
    CONSTRAINT [FK_DiscountReasons_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [FloorPlanZones] (
    [FloorPlanZoneId] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [Name] nvarchar(max) NULL,
    [SortOrder] int NOT NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_FloorPlanZones] PRIMARY KEY ([FloorPlanZoneId]),
    CONSTRAINT [FK_FloorPlanZones_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GoodsGroups] (
    [GoodsGroupId] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [Name] nvarchar(max) NULL,
    [Code] nvarchar(max) NULL,
    [SortOrder] int NOT NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_GoodsGroups] PRIMARY KEY ([GoodsGroupId]),
    CONSTRAINT [FK_GoodsGroups_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [JournalAccessLogs] (
    [Id] bigint NOT NULL IDENTITY,
    [UserId] nvarchar(max) NULL,
    [StoreId] int NOT NULL,
    [Action] nvarchar(max) NULL,
    [Parameters] nvarchar(max) NULL,
    [Timestamp] datetime2 NOT NULL,
    CONSTRAINT [PK_JournalAccessLogs] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [JournalEntries] (
    [JournalEntryId] bigint NOT NULL IDENTITY,
    [CashPointId] int NOT NULL,
    [StoreId] int NOT NULL,
    [SequenceNumber] bigint NOT NULL,
    [EventType] nvarchar(max) NOT NULL,
    [ReceiptType] nvarchar(450) NULL,
    [ReceiptNumber] bigint NULL,
    [Timestamp] datetime2 NOT NULL,
    [OperatorId] int NOT NULL,
    [OperatorName] nvarchar(max) NULL,
    [OrderId] int NULL,
    [GrossAmount] int NOT NULL,
    [NetAmount] int NOT NULL,
    [VatAmount] int NOT NULL,
    [RoundingAmount] int NOT NULL,
    [TipAmount] int NOT NULL,
    [IsTraining] bit NOT NULL,
    [IsVoid] bit NOT NULL,
    [ReferencedReceiptNumber] bigint NULL,
    [Signature] nvarchar(max) NULL,
    [PreviousSignature] nvarchar(max) NULL,
    [KeyVersion] nvarchar(200) NULL,
    [CanonicalData] nvarchar(max) NULL,
    CONSTRAINT [PK_JournalEntries] PRIMARY KEY ([JournalEntryId])
);
GO

CREATE TABLE [Operators] (
    [OperatorId] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [DisplayName] nvarchar(max) NULL,
    [RoleLevel] nvarchar(max) NOT NULL,
    [PinHash] nvarchar(max) NULL,
    [ApplicationUserId] nvarchar(450) NULL,
    [IsActive] bit NOT NULL,
    [FailedPinAttempts] int NOT NULL,
    [LockedUntil] datetime2 NULL,
    [Created] datetime2 NOT NULL,
    CONSTRAINT [PK_Operators] PRIMARY KEY ([OperatorId]),
    CONSTRAINT [FK_Operators_AspNetUsers_ApplicationUserId] FOREIGN KEY ([ApplicationUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_Operators_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [PosSettlements] (
    [PosSettlementId] uniqueidentifier NOT NULL,
    [OrderId] int NOT NULL,
    [CashPointId] int NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    [Created] datetime2 NOT NULL,
    CONSTRAINT [PK_PosSettlements] PRIMARY KEY ([PosSettlementId]),
    CONSTRAINT [FK_PosSettlements_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([OrderId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [ReceiptSequenceCounters] (
    [CashPointId] int NOT NULL,
    [Series] nvarchar(450) NOT NULL,
    [CurrentValue] bigint NOT NULL,
    CONSTRAINT [PK_ReceiptSequenceCounters] PRIMARY KEY ([CashPointId], [Series])
);
GO

CREATE TABLE [ReservationSettings] (
    [ReservationSettingsId] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [Enabled] bit NOT NULL,
    [AllowGuestCancellation] bit NOT NULL,
    [UseStoreHours] bit NOT NULL,
    [SlotMinutes] int NOT NULL,
    [SeatingMinutes] int NOT NULL,
    [BufferMinutes] int NOT NULL,
    [LeadMinutes] int NOT NULL,
    [MaxDaysAhead] int NOT NULL,
    [MaxGuests] int NOT NULL,
    [NoShowGraceMinutes] int NOT NULL,
    CONSTRAINT [PK_ReservationSettings] PRIMARY KEY ([ReservationSettingsId]),
    CONSTRAINT [FK_ReservationSettings_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [SurfboardStoreConfigurations] (
    [Id] int NOT NULL IDENTITY,
    [MerchantId] nvarchar(max) NULL,
    [StoreExternalId] nvarchar(max) NULL,
    [OnlineTerminalId] nvarchar(max) NULL,
    [ApplicationId] nvarchar(max) NULL,
    [OnboardingStatus] nvarchar(max) NULL,
    [WebhookSecret] nvarchar(max) NULL,
    [CardEnabled] bit NOT NULL,
    [VippsEnabled] bit NOT NULL,
    [MobilePayEnabled] bit NOT NULL,
    [SwishEnabled] bit NOT NULL,
    [KlarnaEnabled] bit NOT NULL,
    [TipsEnabled] bit NOT NULL,
    [CommissionPercentage] decimal(5,2) NOT NULL,
    [TerminalCommissionPercentage] decimal(5,2) NOT NULL,
    [WoltDeliveryFeePercent] decimal(5,2) NOT NULL,
    [StoreId] int NOT NULL,
    CONSTRAINT [PK_SurfboardStoreConfigurations] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_SurfboardStoreConfigurations_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE TABLE [ProductAllergens] (
    [ProductAllergenId] int NOT NULL IDENTITY,
    [ProductId] uniqueidentifier NOT NULL,
    [AllergenId] int NOT NULL,
    CONSTRAINT [PK_ProductAllergens] PRIMARY KEY ([ProductAllergenId]),
    CONSTRAINT [FK_ProductAllergens_Allergens_AllergenId] FOREIGN KEY ([AllergenId]) REFERENCES [Allergens] ([AllergenId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ProductAllergens_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([ProductId]) ON DELETE CASCADE
);
GO

CREATE TABLE [CashDrawerSessions] (
    [CashDrawerSessionId] bigint NOT NULL IDENTITY,
    [CashPointId] int NOT NULL,
    [StartFloat] int NOT NULL,
    [StartOperatorId] int NOT NULL,
    [OpenedAt] datetime2 NOT NULL,
    [EndCountedAmount] int NULL,
    [EndOperatorId] int NULL,
    [ClosedAt] datetime2 NULL,
    [ExpectedAmount] int NULL,
    [Difference] int NULL,
    [BankDepositAmount] int NULL,
    [DifferenceExplanation] nvarchar(max) NULL,
    [EodReceiptEmail] nvarchar(max) NULL,
    CONSTRAINT [PK_CashDrawerSessions] PRIMARY KEY ([CashDrawerSessionId]),
    CONSTRAINT [FK_CashDrawerSessions_CashPoints_CashPointId] FOREIGN KEY ([CashPointId]) REFERENCES [CashPoints] ([CashPointId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [ZReports] (
    [ZReportId] bigint NOT NULL IDENTITY,
    [CashPointId] int NOT NULL,
    [ZNumber] bigint NOT NULL,
    [FromSequenceNumber] bigint NOT NULL,
    [ToSequenceNumber] bigint NOT NULL,
    [GeneratedAt] datetime2 NOT NULL,
    [OperatorId] int NOT NULL,
    [SalesCount] bigint NOT NULL,
    [SalesAmount] bigint NOT NULL,
    [ReturnsCount] bigint NOT NULL,
    [ReturnsAmount] bigint NOT NULL,
    [DiscountCount] bigint NOT NULL,
    [DiscountAmount] bigint NOT NULL,
    [CorrectionCount] bigint NOT NULL,
    [CorrectionAmount] bigint NOT NULL,
    [DrawerOpenCount] bigint NOT NULL,
    [CopyReceiptCount] bigint NOT NULL,
    [TrainingCount] bigint NOT NULL,
    [TrainingAmount] bigint NOT NULL,
    [AbortedSalesCount] bigint NOT NULL,
    [TipsAmount] bigint NOT NULL,
    [PaymentTotalsJson] nvarchar(max) NULL,
    [VatTotalsJson] nvarchar(max) NULL,
    [OperatorTotalsJson] nvarchar(max) NULL,
    [GrandTotalSales] bigint NOT NULL,
    [GrandTotalReturns] bigint NOT NULL,
    [GrandTotalNet] bigint NOT NULL,
    [GrandTotalTips] bigint NOT NULL,
    [CashDrawerSessionId] bigint NULL,
    [CashCounted] int NULL,
    [CashExpected] int NULL,
    [CashDifference] int NULL,
    [Signature] nvarchar(max) NULL,
    [PreviousSignature] nvarchar(max) NULL,
    [KeyVersion] nvarchar(200) NULL,
    [CanonicalData] nvarchar(max) NULL,
    CONSTRAINT [PK_ZReports] PRIMARY KEY ([ZReportId]),
    CONSTRAINT [FK_ZReports_CashPoints_CashPointId] FOREIGN KEY ([CashPointId]) REFERENCES [CashPoints] ([CashPointId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [CheckLineAllocations] (
    [CheckLineAllocationId] uniqueidentifier NOT NULL,
    [CheckSplitId] uniqueidentifier NOT NULL,
    [PartNumber] int NOT NULL,
    [PartOrderId] int NOT NULL,
    [SourceOrderLineItemId] uniqueidentifier NULL,
    [VatPercent] int NOT NULL,
    [Amount] int NOT NULL,
    CONSTRAINT [PK_CheckLineAllocations] PRIMARY KEY ([CheckLineAllocationId]),
    CONSTRAINT [FK_CheckLineAllocations_CheckSplits_CheckSplitId] FOREIGN KEY ([CheckSplitId]) REFERENCES [CheckSplits] ([CheckSplitId]) ON DELETE CASCADE
);
GO

CREATE TABLE [Tables] (
    [TableId] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [ZoneId] int NOT NULL,
    [TableNumber] int NOT NULL,
    [Name] nvarchar(max) NULL,
    [Shape] nvarchar(max) NOT NULL,
    [PosX] int NOT NULL,
    [PosY] int NOT NULL,
    [Width] int NOT NULL,
    [Height] int NOT NULL,
    [Rotation] int NOT NULL,
    [Seats] int NOT NULL,
    [SeatsAuto] bit NOT NULL,
    [MinCapacity] int NOT NULL,
    [MaxCapacity] int NOT NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_Tables] PRIMARY KEY ([TableId]),
    CONSTRAINT [FK_Tables_FloorPlanZones_ZoneId] FOREIGN KEY ([ZoneId]) REFERENCES [FloorPlanZones] ([FloorPlanZoneId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Tables_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [JournalLines] (
    [JournalLineId] bigint NOT NULL IDENTITY,
    [JournalEntryId] bigint NOT NULL,
    [LineNumber] int NOT NULL,
    [ProductId] uniqueidentifier NULL,
    [ProductName] nvarchar(max) NULL,
    [ArticleId] nvarchar(max) NULL,
    [GoodsGroupCode] nvarchar(max) NULL,
    [GoodsGroupName] nvarchar(max) NULL,
    [Quantity] int NOT NULL,
    [UnitAmount] int NOT NULL,
    [LineAmount] int NOT NULL,
    [VatPercent] int NOT NULL,
    [VatCode] nvarchar(max) NOT NULL,
    [VatAmount] int NOT NULL,
    [DepositAmount] int NOT NULL,
    [OptionsFlattened] nvarchar(max) NULL,
    [IsOpenPrice] bit NOT NULL,
    [DiscountAmount] int NOT NULL,
    [DiscountReason] nvarchar(max) NULL,
    [OperatorId] int NOT NULL,
    CONSTRAINT [PK_JournalLines] PRIMARY KEY ([JournalLineId]),
    CONSTRAINT [FK_JournalLines_JournalEntries_JournalEntryId] FOREIGN KEY ([JournalEntryId]) REFERENCES [JournalEntries] ([JournalEntryId]) ON DELETE CASCADE
);
GO

CREATE TABLE [JournalPaymentLines] (
    [JournalPaymentLineId] bigint NOT NULL IDENTITY,
    [JournalEntryId] bigint NOT NULL,
    [PaymentType] nvarchar(max) NOT NULL,
    [Amount] int NOT NULL,
    [PaymentTransactionId] uniqueidentifier NULL,
    [CashDrawerTransactionId] bigint NULL,
    CONSTRAINT [PK_JournalPaymentLines] PRIMARY KEY ([JournalPaymentLineId]),
    CONSTRAINT [FK_JournalPaymentLines_JournalEntries_JournalEntryId] FOREIGN KEY ([JournalEntryId]) REFERENCES [JournalEntries] ([JournalEntryId]) ON DELETE CASCADE
);
GO

CREATE TABLE [JournalTaxLines] (
    [JournalTaxLineId] bigint NOT NULL IDENTITY,
    [JournalEntryId] bigint NOT NULL,
    [VatPercent] int NOT NULL,
    [VatCode] nvarchar(max) NOT NULL,
    [Basis] int NOT NULL,
    [Amount] int NOT NULL,
    CONSTRAINT [PK_JournalTaxLines] PRIMARY KEY ([JournalTaxLineId]),
    CONSTRAINT [FK_JournalTaxLines_JournalEntries_JournalEntryId] FOREIGN KEY ([JournalEntryId]) REFERENCES [JournalEntries] ([JournalEntryId]) ON DELETE CASCADE
);
GO

CREATE TABLE [OperatorSessions] (
    [OperatorSessionId] uniqueidentifier NOT NULL,
    [OperatorId] int NOT NULL,
    [StoreId] int NOT NULL,
    [CashPointId] int NOT NULL,
    [StartedAt] datetime2 NOT NULL,
    [EndedAt] datetime2 NULL,
    [DeviceInfo] nvarchar(max) NULL,
    CONSTRAINT [PK_OperatorSessions] PRIMARY KEY ([OperatorSessionId]),
    CONSTRAINT [FK_OperatorSessions_CashPoints_CashPointId] FOREIGN KEY ([CashPointId]) REFERENCES [CashPoints] ([CashPointId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_OperatorSessions_Operators_OperatorId] FOREIGN KEY ([OperatorId]) REFERENCES [Operators] ([OperatorId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [OrderPayments] (
    [OrderPaymentId] uniqueidentifier NOT NULL,
    [PosSettlementId] uniqueidentifier NOT NULL,
    [OrderId] int NOT NULL,
    [PaymentType] nvarchar(max) NOT NULL,
    [Amount] int NOT NULL,
    [PaymentTransactionId] uniqueidentifier NULL,
    [CashDrawerTransactionId] bigint NULL,
    [Status] nvarchar(max) NOT NULL,
    [JournalEntryId] bigint NULL,
    CONSTRAINT [PK_OrderPayments] PRIMARY KEY ([OrderPaymentId]),
    CONSTRAINT [FK_OrderPayments_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([OrderId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_OrderPayments_PosSettlements_PosSettlementId] FOREIGN KEY ([PosSettlementId]) REFERENCES [PosSettlements] ([PosSettlementId]) ON DELETE CASCADE
);
GO

CREATE TABLE [ReservationDateOverrides] (
    [ReservationDateOverrideId] int NOT NULL IDENTITY,
    [ReservationSettingsId] int NOT NULL,
    [Date] datetime2 NOT NULL,
    [Closed] bit NOT NULL,
    [From] nvarchar(max) NULL,
    [To] nvarchar(max) NULL,
    CONSTRAINT [PK_ReservationDateOverrides] PRIMARY KEY ([ReservationDateOverrideId]),
    CONSTRAINT [FK_ReservationDateOverrides_ReservationSettings_ReservationSettingsId] FOREIGN KEY ([ReservationSettingsId]) REFERENCES [ReservationSettings] ([ReservationSettingsId]) ON DELETE CASCADE
);
GO

CREATE TABLE [ReservationDayHours] (
    [ReservationDayHoursId] int NOT NULL IDENTITY,
    [ReservationSettingsId] int NOT NULL,
    [DayOfWeek] int NOT NULL,
    [Open] bit NOT NULL,
    [From] nvarchar(max) NULL,
    [To] nvarchar(max) NULL,
    CONSTRAINT [PK_ReservationDayHours] PRIMARY KEY ([ReservationDayHoursId]),
    CONSTRAINT [FK_ReservationDayHours_ReservationSettings_ReservationSettingsId] FOREIGN KEY ([ReservationSettingsId]) REFERENCES [ReservationSettings] ([ReservationSettingsId]) ON DELETE CASCADE
);
GO

CREATE TABLE [CashDrawerTransactions] (
    [CashDrawerTransactionId] bigint NOT NULL IDENTITY,
    [CashDrawerSessionId] bigint NOT NULL,
    [Type] nvarchar(max) NOT NULL,
    [Amount] int NOT NULL,
    [OperatorId] int NOT NULL,
    [JournalEntryId] bigint NULL,
    [IdempotencyKey] nvarchar(200) NULL,
    [Timestamp] datetime2 NOT NULL,
    CONSTRAINT [PK_CashDrawerTransactions] PRIMARY KEY ([CashDrawerTransactionId]),
    CONSTRAINT [FK_CashDrawerTransactions_CashDrawerSessions_CashDrawerSessionId] FOREIGN KEY ([CashDrawerSessionId]) REFERENCES [CashDrawerSessions] ([CashDrawerSessionId]) ON DELETE CASCADE
);
GO

CREATE TABLE [Reservations] (
    [ReservationId] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [TableId] int NULL,
    [TableName] nvarchar(max) NULL,
    [PartySize] int NOT NULL,
    [StartTime] datetime2 NOT NULL,
    [EndTime] datetime2 NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    [CustomerName] nvarchar(max) NULL,
    [CustomerPhone] nvarchar(max) NULL,
    [Comment] nvarchar(max) NULL,
    [IsWalkIn] bit NOT NULL,
    [CreatedByAdmin] bit NOT NULL,
    [CreatedByUserId] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [CancelToken] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_Reservations] PRIMARY KEY ([ReservationId]),
    CONSTRAINT [FK_Reservations_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Reservations_Tables_TableId] FOREIGN KEY ([TableId]) REFERENCES [Tables] ([TableId]) ON DELETE SET NULL
);
GO

CREATE TABLE [ReservationTables] (
    [ReservationTableId] int NOT NULL IDENTITY,
    [ReservationId] int NOT NULL,
    [TableId] int NULL,
    [TableName] nvarchar(max) NULL,
    [SortOrder] int NOT NULL,
    CONSTRAINT [PK_ReservationTables] PRIMARY KEY ([ReservationTableId]),
    CONSTRAINT [FK_ReservationTables_Reservations_ReservationId] FOREIGN KEY ([ReservationId]) REFERENCES [Reservations] ([ReservationId]) ON DELETE CASCADE,
    CONSTRAINT [FK_ReservationTables_Tables_TableId] FOREIGN KEY ([TableId]) REFERENCES [Tables] ([TableId])
);
GO

CREATE INDEX [IX_Products_GoodsGroupId] ON [Products] ([GoodsGroupId]);
GO

CREATE UNIQUE INDEX [IX_PaymentTransaction_EventIdempotencyKey] ON [PaymentTransaction] ([EventIdempotencyKey]) WHERE [EventIdempotencyKey] IS NOT NULL;
GO

CREATE INDEX [IX_PaymentTransaction_OrderId] ON [PaymentTransaction] ([OrderId]);
GO

CREATE INDEX [IX_Orders_ReservationId] ON [Orders] ([ReservationId]);
GO

CREATE INDEX [IX_Orders_StoreId_Status] ON [Orders] ([StoreId], [Status]);
GO

CREATE INDEX [IX_Orders_TableId] ON [Orders] ([TableId]);
GO

CREATE UNIQUE INDEX [IX_Allergens_StoreId_Code] ON [Allergens] ([StoreId], [Code]) WHERE [Code] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_CashDrawerSessions_CashPointId] ON [CashDrawerSessions] ([CashPointId]) WHERE [ClosedAt] IS NULL;
GO

CREATE INDEX [IX_CashDrawerTransactions_CashDrawerSessionId] ON [CashDrawerTransactions] ([CashDrawerSessionId]);
GO

CREATE INDEX [IX_CashPoints_StoreId] ON [CashPoints] ([StoreId]);
GO

CREATE INDEX [IX_CheckLineAllocations_CheckSplitId] ON [CheckLineAllocations] ([CheckSplitId]);
GO

CREATE INDEX [IX_CheckSplits_OrderId] ON [CheckSplits] ([OrderId]);
GO

CREATE INDEX [IX_DiscountReasons_StoreId] ON [DiscountReasons] ([StoreId]);
GO

CREATE INDEX [IX_FloorPlanZones_StoreId] ON [FloorPlanZones] ([StoreId]);
GO

CREATE INDEX [IX_GoodsGroups_StoreId] ON [GoodsGroups] ([StoreId]);
GO

CREATE INDEX [IX_JournalEntries_CashPointId_OrderId] ON [JournalEntries] ([CashPointId], [OrderId]) WHERE [OrderId] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_JournalEntries_CashPointId_ReceiptType_ReceiptNumber] ON [JournalEntries] ([CashPointId], [ReceiptType], [ReceiptNumber]) WHERE [ReceiptNumber] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_JournalEntries_CashPointId_SequenceNumber] ON [JournalEntries] ([CashPointId], [SequenceNumber]);
GO

CREATE INDEX [IX_JournalEntries_StoreId_Timestamp] ON [JournalEntries] ([StoreId], [Timestamp]);
GO

CREATE INDEX [IX_JournalLines_JournalEntryId] ON [JournalLines] ([JournalEntryId]);
GO

CREATE INDEX [IX_JournalPaymentLines_JournalEntryId] ON [JournalPaymentLines] ([JournalEntryId]);
GO

CREATE INDEX [IX_JournalTaxLines_JournalEntryId] ON [JournalTaxLines] ([JournalEntryId]);
GO

CREATE INDEX [IX_Operators_ApplicationUserId] ON [Operators] ([ApplicationUserId]);
GO

CREATE INDEX [IX_Operators_StoreId] ON [Operators] ([StoreId]);
GO

CREATE INDEX [IX_OperatorSessions_CashPointId] ON [OperatorSessions] ([CashPointId]);
GO

CREATE INDEX [IX_OperatorSessions_OperatorId] ON [OperatorSessions] ([OperatorId]);
GO

CREATE INDEX [IX_OrderPayments_OrderId] ON [OrderPayments] ([OrderId]);
GO

CREATE INDEX [IX_OrderPayments_PosSettlementId] ON [OrderPayments] ([PosSettlementId]);
GO

CREATE UNIQUE INDEX [IX_PosSettlements_OrderId] ON [PosSettlements] ([OrderId]) WHERE [Status] = 'Open';
GO

CREATE INDEX [IX_ProductAllergens_AllergenId] ON [ProductAllergens] ([AllergenId]);
GO

CREATE UNIQUE INDEX [IX_ProductAllergens_ProductId_AllergenId] ON [ProductAllergens] ([ProductId], [AllergenId]);
GO

CREATE UNIQUE INDEX [IX_ReservationDateOverrides_ReservationSettingsId_Date] ON [ReservationDateOverrides] ([ReservationSettingsId], [Date]);
GO

CREATE INDEX [IX_ReservationDayHours_ReservationSettingsId] ON [ReservationDayHours] ([ReservationSettingsId]);
GO

CREATE UNIQUE INDEX [IX_Reservations_CancelToken] ON [Reservations] ([CancelToken]);
GO

CREATE INDEX [IX_Reservations_StoreId_StartTime] ON [Reservations] ([StoreId], [StartTime]);
GO

CREATE INDEX [IX_Reservations_TableId_StartTime] ON [Reservations] ([TableId], [StartTime]);
GO

CREATE UNIQUE INDEX [IX_ReservationSettings_StoreId] ON [ReservationSettings] ([StoreId]);
GO

CREATE INDEX [IX_ReservationTables_ReservationId] ON [ReservationTables] ([ReservationId]);
GO

CREATE INDEX [IX_ReservationTables_TableId_ReservationId] ON [ReservationTables] ([TableId], [ReservationId]);
GO

CREATE UNIQUE INDEX [IX_SurfboardStoreConfigurations_StoreId] ON [SurfboardStoreConfigurations] ([StoreId]);
GO

CREATE UNIQUE INDEX [IX_Tables_StoreId_TableNumber] ON [Tables] ([StoreId], [TableNumber]);
GO

CREATE INDEX [IX_Tables_ZoneId] ON [Tables] ([ZoneId]);
GO

CREATE INDEX [IX_ZReports_CashPointId] ON [ZReports] ([CashPointId]);
GO

ALTER TABLE [Orders] ADD CONSTRAINT [FK_Orders_Reservations_ReservationId] FOREIGN KEY ([ReservationId]) REFERENCES [Reservations] ([ReservationId]);
GO

ALTER TABLE [Orders] ADD CONSTRAINT [FK_Orders_Tables_TableId] FOREIGN KEY ([TableId]) REFERENCES [Tables] ([TableId]) ON DELETE SET NULL;
GO

ALTER TABLE [PaymentTransaction] ADD CONSTRAINT [FK_PaymentTransaction_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([OrderId]) ON DELETE NO ACTION;
GO

ALTER TABLE [Products] ADD CONSTRAINT [FK_Products_GoodsGroups_GoodsGroupId] FOREIGN KEY ([GoodsGroupId]) REFERENCES [GoodsGroups] ([GoodsGroupId]) ON DELETE SET NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260709231226_POSv1', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DROP TABLE [DiscountReasons];
GO

DECLARE @var37 sysname;
SELECT @var37 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[OrderLineItems]') AND [c].[name] = N'DiscountReasonId');
IF @var37 IS NOT NULL EXEC(N'ALTER TABLE [OrderLineItems] DROP CONSTRAINT [' + @var37 + '];');
ALTER TABLE [OrderLineItems] DROP COLUMN [DiscountReasonId];
GO

ALTER TABLE [Stores] ADD [TerminalProvider] nvarchar(max) NOT NULL DEFAULT N'Surfboard';
GO

ALTER TABLE [RegularDiscount] ADD [RequiresManagerPin] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [RegularDiscount] ADD [ShowInPos] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [RegularDiscount] ADD [SortOrder] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [RegularDiscount] ADD [StaffGroup] nvarchar(max) NULL;
GO

ALTER TABLE [CashPoints] ADD [TerminalProvider] nvarchar(max) NOT NULL DEFAULT N'';
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260712144527_PosUxCatalogAndDiscountMerge', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [PaymentTransaction] ADD [PendingReturnDocumentationJson] nvarchar(max) NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [PendingReturnLinesJson] nvarchar(max) NULL;
GO

ALTER TABLE [JournalEntries] ADD [ReturnCustomerPhone] nvarchar(max) NULL;
GO

ALTER TABLE [JournalEntries] ADD [ReturnCustomerSignature] nvarchar(max) NULL;
GO

ALTER TABLE [JournalEntries] ADD [ReturnReason] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260713152931_PosReturnRefundDocumentation', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [SpecialOpeningHours] (
    [SpecialOpeningHourId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [Date] datetime2 NOT NULL,
    [Open] bit NOT NULL,
    [OpeningTime] nvarchar(max) NULL,
    [ClosingTime] nvarchar(max) NULL,
    [Note] nvarchar(max) NULL,
    CONSTRAINT [PK_SpecialOpeningHours] PRIMARY KEY ([SpecialOpeningHourId]),
    CONSTRAINT [FK_SpecialOpeningHours_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_SpecialOpeningHours_StoreId] ON [SpecialOpeningHours] ([StoreId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260713182009_SpecialOpeningHours', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [OrderLineItems] ADD [SeatNumber] int NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260713195246_PosSeatAssignment', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [ZReports] ADD [GrandTotalErrors] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [GrandTotalNegativeSales] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [AccountingConfigurations] ADD [AccountNumber12Percent] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260713225700_Vat12PercentAccounting', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [GoodsGroups] ADD [DeliveryVatPercent] int NULL;
GO

ALTER TABLE [GoodsGroups] ADD [EatInVatPercent] int NULL;
GO

ALTER TABLE [GoodsGroups] ADD [TakeAwayVatPercent] int NULL;
GO

ALTER TABLE [AccountingConfigurations] ADD [AccountNumberTips] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260714004948_GoodsGroupVatProfileAndTips', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [TripletexConnections] (
    [TripletexConnectionId] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [TokenType] int NOT NULL,
    [ApiToken] nvarchar(max) NULL,
    [CompanyId] nvarchar(max) NULL,
    [IsActive] bit NOT NULL,
    [LastVerifiedUtc] datetime2 NULL,
    [LastVerifiedEmployeeId] int NULL,
    [LastVerifiedCompanyId] int NULL,
    [LastError] nvarchar(max) NULL,
    [BankAccountNumber] nvarchar(max) NULL,
    [FeeAccountNumber] nvarchar(max) NULL,
    [CashboxAccountNumber] nvarchar(max) NULL,
    [CashDifferenceAccountNumber] nvarchar(max) NULL,
    [BankDepositAccountNumber] nvarchar(max) NULL,
    [RoundingAccountNumber] nvarchar(max) NULL,
    [DinteroIntermediaryAccountNumber] nvarchar(max) NULL,
    [SurfboardIntermediaryAccountNumber] nvarchar(max) NULL,
    CONSTRAINT [PK_TripletexConnections] PRIMARY KEY ([TripletexConnectionId]),
    CONSTRAINT [FK_TripletexConnections_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE TABLE [TripletexVoucherLogs] (
    [TripletexVoucherLogId] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [Kind] int NOT NULL,
    [BusinessDate] datetime2 NOT NULL,
    [ExternalKey] nvarchar(450) NULL,
    [TripletexVoucherId] bigint NULL,
    [Status] int NOT NULL,
    [GrossOre] bigint NOT NULL,
    [Error] nvarchar(max) NULL,
    [CreatedUtc] datetime2 NOT NULL,
    [PostedUtc] datetime2 NULL,
    CONSTRAINT [PK_TripletexVoucherLogs] PRIMARY KEY ([TripletexVoucherLogId]),
    CONSTRAINT [FK_TripletexVoucherLogs_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [IX_TripletexConnections_StoreId] ON [TripletexConnections] ([StoreId]);
GO

CREATE UNIQUE INDEX [IX_TripletexVoucherLogs_ExternalKey] ON [TripletexVoucherLogs] ([ExternalKey]) WHERE [ExternalKey] IS NOT NULL;
GO

CREATE INDEX [IX_TripletexVoucherLogs_StoreId] ON [TripletexVoucherLogs] ([StoreId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260714014129_AddTripletexIntegration', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [JournalEntries] ADD [ReturnReasonType] nvarchar(max) NULL;
GO

ALTER TABLE [CashPoints] ADD [AllowFastOperatorSwitch] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [CashPoints] ADD [RequireManagerForRefund] bit NOT NULL DEFAULT CAST(1 AS bit);
GO

ALTER TABLE [CashPoints] ADD [RequireManagerForReturn] bit NOT NULL DEFAULT CAST(1 AS bit);
GO

ALTER TABLE [CashPoints] ADD [RequireManagerForVoid] bit NOT NULL DEFAULT CAST(1 AS bit);
GO

ALTER TABLE [CashDrawerSessions] ADD [DifferenceReasonType] nvarchar(max) NULL;
GO

UPDATE [Operators] SET [RoleLevel] = 'Standard' WHERE [RoleLevel] IN ('Servitor', 'Kasserer');
GO

UPDATE [Operators] SET [RoleLevel] = 'Godkjenner' WHERE [RoleLevel] IN ('Leder', 'Eier');
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260714192953_PosSimplificationReasonsRoles', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [OpenPricePresets] (
    [OpenPricePresetId] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [Name] nvarchar(max) NULL,
    [GoodsGroupId] int NOT NULL,
    [SortOrder] int NOT NULL,
    [IsActive] bit NOT NULL,
    [Created] datetime2 NOT NULL,
    CONSTRAINT [PK_OpenPricePresets] PRIMARY KEY ([OpenPricePresetId]),
    CONSTRAINT [FK_OpenPricePresets_GoodsGroups_GoodsGroupId] FOREIGN KEY ([GoodsGroupId]) REFERENCES [GoodsGroups] ([GoodsGroupId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_OpenPricePresets_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_OpenPricePresets_GoodsGroupId] ON [OpenPricePresets] ([GoodsGroupId]);
GO

CREATE INDEX [IX_OpenPricePresets_StoreId] ON [OpenPricePresets] ([StoreId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260714193634_AddOpenPricePreset', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var38 sysname;
SELECT @var38 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[RegularDiscount]') AND [c].[name] = N'StaffGroup');
IF @var38 IS NOT NULL EXEC(N'ALTER TABLE [RegularDiscount] DROP CONSTRAINT [' + @var38 + '];');
ALTER TABLE [RegularDiscount] DROP COLUMN [StaffGroup];
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260714211505_RemoveDiscountStaffGroup', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [OperatorSessions] ADD [PinVerified] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260715090000_AddOperatorSessionPinVerified', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [SurfboardStoreConfigurations] ADD [PartialPaymentsEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [PosSettlements] ADD [ProviderOrderReference] nvarchar(max) NULL;
GO

DECLARE @var39 sysname;
SELECT @var39 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[PaymentTransaction]') AND [c].[name] = N'SurfboardPaymentId');
IF @var39 IS NOT NULL EXEC(N'ALTER TABLE [PaymentTransaction] DROP CONSTRAINT [' + @var39 + '];');
ALTER TABLE [PaymentTransaction] ALTER COLUMN [SurfboardPaymentId] nvarchar(450) NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [PortionAmount] int NULL;
GO

ALTER TABLE [PaymentTransaction] ADD [PosSettlementId] uniqueidentifier NULL;
GO

ALTER TABLE [OrderPayments] ADD [ProviderPaymentId] nvarchar(max) NULL;
GO

CREATE INDEX [IX_PaymentTransaction_SurfboardPaymentId] ON [PaymentTransaction] ([SurfboardPaymentId]) WHERE [SurfboardPaymentId] IS NOT NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260715103455_SurfboardPartialPayments', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE UNIQUE INDEX [IX_OrderPayments_PaymentTransactionId] ON [OrderPayments] ([PaymentTransactionId]) WHERE [PaymentTransactionId] IS NOT NULL AND [Status] = 'Confirmed';
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260715171848_OrderPaymentConfirmedPartUniqueIndex', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [ZReports] ADD [CopyReceiptAmount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [LineCorrectionAmount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [LineCorrectionCount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [ManualDrawerOpenCount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [ProvisionalReceiptAmount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [ProvisionalReceiptCount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [StartFloat] int NULL;
GO

ALTER TABLE [ZReports] ADD [TipsCount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [JournalEntries] ADD [ReferencedJournalEntryId] bigint NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260715182653_FiscalReportCompliance', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DROP INDEX [IX_JournalEntries_CashPointId_OrderId] ON [JournalEntries];
GO

DROP INDEX [IX_GoodsGroups_StoreId] ON [GoodsGroups];
GO

ALTER TABLE [ZReports] ADD [BankDepositAmount] int NULL;
GO

ALTER TABLE [ZReports] ADD [DifferenceExplanation] nvarchar(max) NULL;
GO

ALTER TABLE [ZReports] ADD [GoodsGroupTotalsJson] nvarchar(max) NULL;
GO

ALTER TABLE [ZReports] ADD [PayInAmount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [PayInCount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [PayOutAmount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [PayOutCount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

DECLARE @var40 sysname;
SELECT @var40 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[GoodsGroups]') AND [c].[name] = N'Code');
IF @var40 IS NOT NULL EXEC(N'ALTER TABLE [GoodsGroups] DROP CONSTRAINT [' + @var40 + '];');
ALTER TABLE [GoodsGroups] ALTER COLUMN [Code] nvarchar(450) NULL;
GO

ALTER TABLE [CashDrawerTransactions] ADD [PairedSaleTransactionId] bigint NULL;
GO

CREATE UNIQUE INDEX [IX_JournalEntries_CashPointId_OrderId] ON [JournalEntries] ([CashPointId], [OrderId]) WHERE [OrderId] IS NOT NULL AND [ReceiptType] = 'Sale';
GO

CREATE UNIQUE INDEX [IX_GoodsGroups_StoreId_Code] ON [GoodsGroups] ([StoreId], [Code]) WHERE [Code] IS NOT NULL;
GO

CREATE INDEX [IX_CashDrawerTransactions_PairedSaleTransactionId] ON [CashDrawerTransactions] ([PairedSaleTransactionId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260716003156_PosPendingSchemaAndCashDrawerPairing', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var41 sysname;
SELECT @var41 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[RegularDiscount]') AND [c].[name] = N'RequiresManagerPin');
IF @var41 IS NOT NULL EXEC(N'ALTER TABLE [RegularDiscount] DROP CONSTRAINT [' + @var41 + '];');
ALTER TABLE [RegularDiscount] DROP COLUMN [RequiresManagerPin];
GO

DECLARE @var42 sysname;
SELECT @var42 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Operators]') AND [c].[name] = N'RoleLevel');
IF @var42 IS NOT NULL EXEC(N'ALTER TABLE [Operators] DROP CONSTRAINT [' + @var42 + '];');
ALTER TABLE [Operators] DROP COLUMN [RoleLevel];
GO

DECLARE @var43 sysname;
SELECT @var43 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[CashPoints]') AND [c].[name] = N'RequireManagerForRefund');
IF @var43 IS NOT NULL EXEC(N'ALTER TABLE [CashPoints] DROP CONSTRAINT [' + @var43 + '];');
ALTER TABLE [CashPoints] DROP COLUMN [RequireManagerForRefund];
GO

DECLARE @var44 sysname;
SELECT @var44 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[CashPoints]') AND [c].[name] = N'RequireManagerForReturn');
IF @var44 IS NOT NULL EXEC(N'ALTER TABLE [CashPoints] DROP CONSTRAINT [' + @var44 + '];');
ALTER TABLE [CashPoints] DROP COLUMN [RequireManagerForReturn];
GO

DECLARE @var45 sysname;
SELECT @var45 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[CashPoints]') AND [c].[name] = N'RequireManagerForVoid');
IF @var45 IS NOT NULL EXEC(N'ALTER TABLE [CashPoints] DROP CONSTRAINT [' + @var45 + '];');
ALTER TABLE [CashPoints] DROP COLUMN [RequireManagerForVoid];
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260716195542_RemoveOperatorRolesAndGates', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [ZReports] ADD [AbortedSalesAmount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [NegativeSalesAmount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [NegativeSalesCount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [ReferencedReturnsAmount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [ReferencedReturnsCount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [SalesNetAmount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

ALTER TABLE [ZReports] ADD [SalesVatAmount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260716224234_ZReportReportCompletenessColumns', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Orders] ADD [ConcurrencyVersion] int NOT NULL DEFAULT 0;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260716235822_OrderConcurrencyVersion', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [OrderLineItems] ADD [LineNumber] int NOT NULL DEFAULT 0;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260717104411_OrderLineItemLineNumber', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260717224125_PosSettlementStatusConcurrencyToken', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DROP INDEX [IX_CashDrawerTransactions_CashDrawerSessionId] ON [CashDrawerTransactions];
GO

CREATE UNIQUE INDEX [IX_CashDrawerTransactions_CashDrawerSessionId_IdempotencyKey] ON [CashDrawerTransactions] ([CashDrawerSessionId], [IdempotencyKey]) WHERE [IdempotencyKey] IS NOT NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260723014851_CashDrawerIdempotencyUniqueIndex', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [PaymentTransaction] ADD [PendingRefundId] uniqueidentifier NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260723075650_PaymentTransactionPendingRefundId', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [PosSettlements] ADD [ActiveOperation] nvarchar(max) NULL;
GO

ALTER TABLE [PosSettlements] ADD [ActiveOperationAt] datetime2 NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260723080128_PosSettlementOperationLease', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var46 sysname;
SELECT @var46 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Orders]') AND [c].[name] = N'SurfboardOrderId');
IF @var46 IS NOT NULL EXEC(N'ALTER TABLE [Orders] DROP CONSTRAINT [' + @var46 + '];');
ALTER TABLE [Orders] ALTER COLUMN [SurfboardOrderId] nvarchar(450) NULL;
GO

CREATE UNIQUE INDEX [IX_Orders_SurfboardOrderId] ON [Orders] ([SurfboardOrderId]) WHERE [SurfboardOrderId] IS NOT NULL AND [Status] <> 'Canceled';
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260723083537_OrderSurfboardOrderIdUniqueIndex', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DROP INDEX [IX_ZReports_CashPointId] ON [ZReports];
GO

CREATE UNIQUE INDEX [IX_ZReports_CashPointId_FromSequenceNumber] ON [ZReports] ([CashPointId], [FromSequenceNumber]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260723092412_ZReportWindowUniqueIndex', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DROP INDEX [IX_CashPoints_StoreId] ON [CashPoints];
GO

ALTER TABLE [JournalEntries] ADD [ReturnIdempotencyKey] uniqueidentifier NULL;
GO

DECLARE @var47 sysname;
SELECT @var47 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[CashPoints]') AND [c].[name] = N'RegisterId');
IF @var47 IS NOT NULL EXEC(N'ALTER TABLE [CashPoints] DROP CONSTRAINT [' + @var47 + '];');
ALTER TABLE [CashPoints] ALTER COLUMN [RegisterId] nvarchar(100) NULL;
GO

CREATE UNIQUE INDEX [IX_JournalEntries_ReferencedJournalEntryId] ON [JournalEntries] ([ReferencedJournalEntryId]) WHERE [ReferencedJournalEntryId] IS NOT NULL AND [EventType] = 'COPYREC';
GO

CREATE UNIQUE INDEX [IX_JournalEntries_ReturnIdempotencyKey] ON [JournalEntries] ([ReturnIdempotencyKey]) WHERE [ReturnIdempotencyKey] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_CashPoints_StoreId_RegisterId] ON [CashPoints] ([StoreId], [RegisterId]) WHERE [RegisterId] IS NOT NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260723192742_ReturnCopyRegisterIdBackstops', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [ZReports] ADD [ReceiptCount] bigint NOT NULL DEFAULT CAST(0 AS bigint);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260724001830_ZReportReceiptCount', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Stores] ADD [Country] nvarchar(max) NULL;
GO

ALTER TABLE [Stores] ADD [CurrencyCode] nvarchar(max) NULL;
GO

ALTER TABLE [Stores] ADD [TimeZone] nvarchar(max) NULL;
GO

CREATE TABLE [EventsSpaces] (
    [Id] int NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [Name] nvarchar(256) NULL,
    [Capacity] int NOT NULL,
    [Notes] nvarchar(2048) NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_EventsSpaces] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EventsSpaces_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthConsentTextVersions] (
    [Id] bigint NOT NULL IDENTITY,
    [Locale] nvarchar(16) NULL,
    [Version] int NOT NULL,
    [Text] nvarchar(max) NULL,
    [CoversOpenMeasurement] bit NOT NULL,
    [EffectiveAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_GrowthConsentTextVersions] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [GrowthContactPoints] (
    [Id] bigint NOT NULL IDENTITY,
    [Channel] nvarchar(16) NOT NULL,
    [EncryptedAddress] nvarchar(max) NULL,
    [LookupHmac] nvarchar(128) NULL,
    [HmacKeyVersion] int NOT NULL,
    [VerificationState] nvarchar(16) NOT NULL,
    [AddressVersion] int NOT NULL,
    [Provenance] nvarchar(128) NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_GrowthContactPoints] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [GrowthNewsletters] (
    [Id] bigint NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [State] nvarchar(32) NOT NULL,
    [CurrentVersionNo] int NOT NULL,
    [CreatedByUserId] nvarchar(450) NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_GrowthNewsletters] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [GrowthProviderAccounts] (
    [Id] bigint NOT NULL IDENTITY,
    [ProviderKey] nvarchar(64) NULL,
    [StoreId] int NOT NULL,
    [SendingDomain] nvarchar(256) NULL,
    [WebhookSecretRef] nvarchar(256) NULL,
    [Paused] bit NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_GrowthProviderAccounts] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [GrowthSegments] (
    [Id] bigint NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [SegmentKey] nvarchar(64) NULL,
    [DefinitionVersion] int NOT NULL,
    [Description] nvarchar(256) NULL,
    CONSTRAINT [PK_GrowthSegments] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [MarginIngredients] (
    [IngredientId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [Name] nvarchar(256) NULL,
    [BaseUnit] nvarchar(16) NOT NULL,
    [Notes] nvarchar(1024) NULL,
    [Status] nvarchar(16) NOT NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginIngredients] PRIMARY KEY ([IngredientId]),
    CONSTRAINT [AK_MarginIngredients_StoreId_IngredientId] UNIQUE ([StoreId], [IngredientId])
);
GO

CREATE TABLE [MarginPeriodStatements] (
    [StatementId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [PeriodStart] datetime2 NOT NULL,
    [PeriodEnd] datetime2 NOT NULL,
    [RevisionNumber] int NOT NULL,
    [PreviousStatementId] uniqueidentifier NULL,
    [State] nvarchar(16) NOT NULL,
    [NetFoodSalesMinor] bigint NOT NULL,
    [TheoreticalIngredientCostMinor] bigint NOT NULL,
    [ActualPurchaseSpendMinor] bigint NOT NULL,
    [OpeningStockValueMinor] bigint NULL,
    [ClosingStockValueMinor] bigint NULL,
    [TheoreticalFoodCostPercent] decimal(18,6) NULL,
    [ActualFoodCostPercent] decimal(18,6) NULL,
    [GapPercentagePoints] decimal(18,6) NULL,
    [CoveragePercent] decimal(18,6) NULL,
    [ProjectionWatermark] bigint NULL,
    [InputReceiptJson] nvarchar(max) NULL,
    [CalculationTimestampUtc] datetime2 NULL,
    [FinalizedAtUtc] datetime2 NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginPeriodStatements] PRIMARY KEY ([StatementId]),
    CONSTRAINT [AK_MarginPeriodStatements_StoreId_StatementId] UNIQUE ([StoreId], [StatementId]),
    CONSTRAINT [FK_MarginPeriodStatements_MarginPeriodStatements_StoreId_PreviousStatementId] FOREIGN KEY ([StoreId], [PreviousStatementId]) REFERENCES [MarginPeriodStatements] ([StoreId], [StatementId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MarginProjectionWatermarks] (
    [StoreId] int NOT NULL,
    [LastProcessedJournalEntryId] bigint NOT NULL,
    [LastProcessedAtUtc] datetime2 NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginProjectionWatermarks] PRIMARY KEY ([StoreId])
);
GO

CREATE TABLE [MarginRecipes] (
    [RecipeId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [Name] nvarchar(256) NULL,
    [Kind] nvarchar(16) NOT NULL,
    [Notes] nvarchar(1024) NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginRecipes] PRIMARY KEY ([RecipeId]),
    CONSTRAINT [AK_MarginRecipes_StoreId_RecipeId] UNIQUE ([StoreId], [RecipeId])
);
GO

CREATE TABLE [MarginSalesFacts] (
    [Id] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [BusinessDate] datetime2 NOT NULL,
    [ProductId] uniqueidentifier NULL,
    [ProductNameSnapshot] nvarchar(256) NULL,
    [ArticleId] nvarchar(128) NULL,
    [QuantitySigned] int NOT NULL,
    [NetSalesMinor] bigint NOT NULL,
    [VatMinor] bigint NOT NULL,
    [DepositMinor] bigint NOT NULL,
    [DiscountMinor] bigint NOT NULL,
    [JournalEntryId] bigint NOT NULL,
    [JournalLineId] bigint NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginSalesFacts] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [MarginSuppliers] (
    [SupplierId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [Name] nvarchar(256) NULL,
    [OrganizationNumber] nvarchar(64) NULL,
    [ContactName] nvarchar(256) NULL,
    [ContactEmail] nvarchar(256) NULL,
    [ContactPhone] nvarchar(64) NULL,
    [Status] nvarchar(16) NOT NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginSuppliers] PRIMARY KEY ([SupplierId]),
    CONSTRAINT [AK_MarginSuppliers_StoreId_SupplierId] UNIQUE ([StoreId], [SupplierId])
);
GO

CREATE TABLE [MealsAuditEvents] (
    [Id] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [ActorReference] nvarchar(256) NULL,
    [EventType] nvarchar(128) NULL,
    [AggregateType] nvarchar(128) NULL,
    [AggregateId] nvarchar(128) NULL,
    [CorrelationId] nvarchar(128) NULL,
    [IdempotencyKey] nvarchar(256) NULL,
    [PayloadSnapshotJson] nvarchar(max) NULL,
    [OccurredAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsAuditEvents] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [MealsCompanies] (
    [CompanyId] uniqueidentifier NOT NULL,
    [OrganizationNumber] nvarchar(64) NULL,
    [CountryCode] nvarchar(8) NULL,
    [LegalName] nvarchar(256) NULL,
    [DisplayName] nvarchar(256) NULL,
    [BillingContactName] nvarchar(256) NULL,
    [BillingContactEmail] nvarchar(256) NULL,
    [BillingContactPhone] nvarchar(64) NULL,
    [Status] nvarchar(32) NOT NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsCompanies] PRIMARY KEY ([CompanyId])
);
GO

CREATE TABLE [MealsCreditAdjustments] (
    [CreditAdjustmentId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [StatementRunId] uniqueidentifier NOT NULL,
    [SourceReversalAllocationId] uniqueidentifier NOT NULL,
    [OrderId] int NOT NULL,
    [SourceReceiptNumber] bigint NULL,
    [MemberDisplayRef] nvarchar(256) NULL,
    [GrossMinor] bigint NOT NULL,
    [NetMinor] bigint NOT NULL,
    [VatMinor] bigint NOT NULL,
    [VatLinesJson] nvarchar(max) NULL,
    [Currency] nchar(3) NOT NULL,
    [OccurredAtUtc] datetime2 NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsCreditAdjustments] PRIMARY KEY ([CreditAdjustmentId]),
    CONSTRAINT [CK_MealsCreditAdjustments_Currency] CHECK (LEN([Currency]) = 3)
);
GO

CREATE TABLE [MealsFundingAllocations] (
    [AllocationId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [AttributionId] uniqueidentifier NOT NULL,
    [ReservationId] uniqueidentifier NOT NULL,
    [ProgramId] uniqueidentifier NOT NULL,
    [MembershipId] uniqueidentifier NOT NULL,
    [PeriodKey] nvarchar(16) NOT NULL,
    [Kind] nvarchar(32) NOT NULL,
    [GrossMinor] bigint NOT NULL,
    [NetMinor] bigint NOT NULL,
    [VatMinor] bigint NOT NULL,
    [VatLinesJson] nvarchar(max) NULL,
    [Currency] nchar(3) NOT NULL,
    [SourceJournalEntryId] bigint NOT NULL,
    [SourceReceiptNumber] bigint NULL,
    [OccurredAtUtc] datetime2 NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsFundingAllocations] PRIMARY KEY ([AllocationId]),
    CONSTRAINT [CK_MealsFundingAllocations_Currency] CHECK (LEN([Currency]) = 3)
);
GO

CREATE TABLE [MealsProjectionCheckpoints] (
    [CheckpointId] uniqueidentifier NOT NULL,
    [ProjectionName] nvarchar(64) NOT NULL,
    [StoreId] int NOT NULL,
    [LastProcessedJournalEntryId] bigint NOT NULL,
    [ConcurrencyVersion] rowversion NULL,
    [UpdatedAtUtc] datetime2 NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsProjectionCheckpoints] PRIMARY KEY ([CheckpointId])
);
GO

CREATE TABLE [MealsReconciliationExceptions] (
    [ExceptionId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [Kind] nvarchar(32) NOT NULL,
    [SourceKey] nvarchar(128) NOT NULL,
    [ReasonCode] nvarchar(64) NULL,
    [State] nvarchar(32) NOT NULL,
    [OwnerNote] nvarchar(max) NULL,
    [AcknowledgedAtUtc] datetime2 NULL,
    [ResolvedAtUtc] datetime2 NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsReconciliationExceptions] PRIMARY KEY ([ExceptionId])
);
GO

CREATE TABLE [StoreFeatureFlags] (
    [Id] bigint NOT NULL IDENTITY,
    [StoreId] int NOT NULL,
    [FlagKey] nvarchar(128) NOT NULL,
    [Enabled] bit NOT NULL,
    [UpdatedByReference] nvarchar(256) NULL,
    [Note] nvarchar(512) NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    [UpdatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_StoreFeatureFlags] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [TrainingAuditEvents] (
    [Id] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [ActorReference] nvarchar(256) NULL,
    [EventType] nvarchar(128) NULL,
    [AggregateType] nvarchar(128) NULL,
    [AggregateId] nvarchar(128) NULL,
    [CorrelationId] nvarchar(128) NULL,
    [IdempotencyKey] nvarchar(256) NULL,
    [PayloadSnapshotJson] nvarchar(max) NULL,
    [OccurredAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_TrainingAuditEvents] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [TrainingCertificates] (
    [CertificateId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [PersonRef] uniqueidentifier NOT NULL,
    [Type] nvarchar(128) NULL,
    [Issuer] nvarchar(256) NULL,
    [IssueDate] datetime2 NOT NULL,
    [ExpiryDate] datetime2 NULL,
    [DocumentReference] nvarchar(512) NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_TrainingCertificates] PRIMARY KEY ([CertificateId])
);
GO

CREATE TABLE [TrainingCompletions] (
    [CompletionId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [CourseId] uniqueidentifier NOT NULL,
    [CourseVersionId] uniqueidentifier NOT NULL,
    [PersonRef] uniqueidentifier NOT NULL,
    [ScorePercent] decimal(5,2) NOT NULL,
    [Passed] bit NOT NULL,
    [VersionContentHash] nvarchar(128) NULL,
    [Source] nvarchar(32) NOT NULL,
    [CompletedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_TrainingCompletions] PRIMARY KEY ([CompletionId])
);
GO

CREATE TABLE [TrainingCourses] (
    [CourseId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [Title] nvarchar(256) NULL,
    [Category] nvarchar(128) NULL,
    [CompetencyKey] nvarchar(128) NULL,
    [IsActive] bit NOT NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_TrainingCourses] PRIMARY KEY ([CourseId]),
    CONSTRAINT [AK_TrainingCourses_StoreId_CourseId] UNIQUE ([StoreId], [CourseId])
);
GO

CREATE TABLE [TrainingIdempotencyRecords] (
    [IdempotencyRecordId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [Scope] nvarchar(128) NOT NULL,
    [ActorReference] nvarchar(256) NULL,
    [IdempotencyKey] nvarchar(256) NOT NULL,
    [RequestHash] nvarchar(128) NULL,
    [Status] nvarchar(32) NOT NULL,
    [ResponseSnapshotJson] nvarchar(max) NULL,
    [ResponseStatusCode] int NULL,
    [ExpiresAtUtc] datetime2 NOT NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_TrainingIdempotencyRecords] PRIMARY KEY ([IdempotencyRecordId])
);
GO

CREATE TABLE [WorkforceAuditEvents] (
    [Id] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [ActorReference] nvarchar(256) NULL,
    [Action] nvarchar(128) NULL,
    [AggregateType] nvarchar(128) NULL,
    [AggregateId] nvarchar(128) NULL,
    [CorrelationId] nvarchar(128) NULL,
    [IdempotencyKey] nvarchar(256) NULL,
    [SemanticDeltaJson] nvarchar(max) NULL,
    [ProtectedDocumentRef] nvarchar(256) NULL,
    [OccurredAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceAuditEvents] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [WorkforceIdempotencyRecords] (
    [Id] uniqueidentifier NOT NULL,
    [Scope] nvarchar(128) NULL,
    [Key] nvarchar(256) NULL,
    [ActorReference] nvarchar(256) NULL,
    [StoreId] int NOT NULL,
    [CanonicalRequestHash] nvarchar(128) NULL,
    [OutcomeState] nvarchar(32) NULL,
    [OutcomePayload] nvarchar(max) NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    [ExpiresAtUtc] datetime2 NULL,
    CONSTRAINT [PK_WorkforceIdempotencyRecords] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [WorkforceLegalEmployers] (
    [LegalEmployerId] uniqueidentifier NOT NULL,
    [OrganizationNumber] nvarchar(64) NULL,
    [Name] nvarchar(256) NULL,
    [EffectiveFromUtc] datetime2 NOT NULL,
    [EffectiveToUtc] datetime2 NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceLegalEmployers] PRIMARY KEY ([LegalEmployerId])
);
GO

CREATE TABLE [WorkforceNotificationOutbox] (
    [NotificationOutboxId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [Channel] nvarchar(16) NOT NULL,
    [Status] nvarchar(32) NOT NULL,
    [LogicalDedupeKey] nvarchar(256) NULL,
    [TargetReference] nvarchar(256) NULL,
    [PayloadJson] nvarchar(max) NULL,
    [AttemptCount] int NOT NULL,
    [MaxAttempts] int NOT NULL,
    [NextAttemptUtc] datetime2 NOT NULL,
    [LeaseOwner] nvarchar(128) NULL,
    [LeaseExpiresUtc] datetime2 NULL,
    [LastError] nvarchar(max) NULL,
    [DeadLetteredAtUtc] datetime2 NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceNotificationOutbox] PRIMARY KEY ([NotificationOutboxId])
);
GO

CREATE TABLE [WorkforcePersons] (
    [WorkforcePersonId] uniqueidentifier NOT NULL,
    [ApplicationUserId] nvarchar(450) NULL,
    [State] nvarchar(32) NOT NULL,
    [DisplayName] nvarchar(256) NULL,
    [ContactEmail] nvarchar(256) NULL,
    [ContactPhone] nvarchar(64) NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforcePersons] PRIMARY KEY ([WorkforcePersonId])
);
GO

CREATE TABLE [WorkforceRoles] (
    [RoleId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [Name] nvarchar(128) NULL,
    [Station] nvarchar(128) NULL,
    [Color] nvarchar(32) NULL,
    [SortOrder] int NOT NULL,
    [EffectiveFromUtc] datetime2 NOT NULL,
    [EffectiveToUtc] datetime2 NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceRoles] PRIMARY KEY ([RoleId]),
    CONSTRAINT [AK_WorkforceRoles_StoreId_RoleId] UNIQUE ([StoreId], [RoleId])
);
GO

CREATE TABLE [WorkforceRuleSetVersions] (
    [Id] uniqueidentifier NOT NULL,
    [Jurisdiction] nvarchar(16) NULL,
    [PackName] nvarchar(64) NULL,
    [Version] int NOT NULL,
    [EffectiveFromUtc] datetime2 NOT NULL,
    [EffectiveToUtc] datetime2 NULL,
    [DecisionTablesJson] nvarchar(max) NULL,
    [EnforcementMode] nvarchar(32) NOT NULL,
    [CounselSignatureRef] nvarchar(256) NULL,
    [CounselSignedBy] nvarchar(256) NULL,
    [CounselSignedAtUtc] datetime2 NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceRuleSetVersions] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_WorkforceRuleSetVersions_EnforcementSignature] CHECK ([EnforcementMode] <> 'Blocking' OR [CounselSignatureRef] IS NOT NULL)
);
GO

CREATE TABLE [WorkforceScheduleRevisions] (
    [ScheduleRevisionId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [RangeStartUtc] datetime2 NOT NULL,
    [RangeEndUtc] datetime2 NOT NULL,
    [RevisionNumber] int NOT NULL,
    [State] nvarchar(32) NOT NULL,
    [TimeZoneId] nvarchar(64) NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceScheduleRevisions] PRIMARY KEY ([ScheduleRevisionId]),
    CONSTRAINT [AK_WorkforceScheduleRevisions_StoreId_ScheduleRevisionId] UNIQUE ([StoreId], [ScheduleRevisionId])
);
GO

CREATE TABLE [EventsEvents] (
    [Id] int NOT NULL IDENTITY,
    [PublicId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [Status] nvarchar(32) NOT NULL,
    [Title] nvarchar(256) NULL,
    [EventDate] date NOT NULL,
    [StartTime] time NULL,
    [EndTime] time NULL,
    [TimeZoneId] nvarchar(64) NULL,
    [GuestCountPlanned] int NOT NULL,
    [SpaceId] int NULL,
    [ContactName] nvarchar(256) NULL,
    [ContactEmail] nvarchar(256) NULL,
    [ContactPhone] nvarchar(64) NULL,
    [CompanyName] nvarchar(256) NULL,
    [CompanyOrgNumber] nvarchar(64) NULL,
    [Source] nvarchar(32) NOT NULL,
    [AcceptedProposalVersionNo] int NULL,
    [CreatedByUserId] nvarchar(450) NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    [RowVersion] rowversion NULL,
    CONSTRAINT [PK_EventsEvents] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EventsEvents_AspNetUsers_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_EventsEvents_EventsSpaces_SpaceId] FOREIGN KEY ([SpaceId]) REFERENCES [EventsSpaces] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_EventsEvents_Stores_StoreId] FOREIGN KEY ([StoreId]) REFERENCES [Stores] ([StoreId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthConsentCheckReceipts] (
    [Id] bigint NOT NULL IDENTITY,
    [CallerModule] nvarchar(64) NULL,
    [StoreId] int NOT NULL,
    [Channel] nvarchar(16) NOT NULL,
    [Purpose] nvarchar(32) NOT NULL,
    [ContactPointId] bigint NULL,
    [Decision] nvarchar(16) NOT NULL,
    [DenyReason] nvarchar(32) NOT NULL,
    [GuardVersion] int NOT NULL,
    [EvaluatedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_GrowthConsentCheckReceipts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthConsentCheckReceipts_GrowthContactPoints_ContactPointId] FOREIGN KEY ([ContactPointId]) REFERENCES [GrowthContactPoints] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthConsentReceipts] (
    [Id] bigint NOT NULL IDENTITY,
    [ContactPointId] bigint NOT NULL,
    [StoreId] int NOT NULL,
    [Channel] nvarchar(16) NOT NULL,
    [Purpose] nvarchar(32) NOT NULL,
    [Action] nvarchar(32) NOT NULL,
    [LawfulBasis] nvarchar(128) NULL,
    [CaptureSource] nvarchar(128) NULL,
    [ConsentTextVersionId] bigint NOT NULL,
    [EvidenceJson] nvarchar(max) NULL,
    [OccurredAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_GrowthConsentReceipts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthConsentReceipts_GrowthConsentTextVersions_ConsentTextVersionId] FOREIGN KEY ([ConsentTextVersionId]) REFERENCES [GrowthConsentTextVersions] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_GrowthConsentReceipts_GrowthContactPoints_ContactPointId] FOREIGN KEY ([ContactPointId]) REFERENCES [GrowthContactPoints] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthPreferenceTokens] (
    [Id] bigint NOT NULL IDENTITY,
    [TokenHash] nvarchar(128) NULL,
    [ContactPointId] bigint NOT NULL,
    [StoreId] int NOT NULL,
    [Channel] nvarchar(16) NOT NULL,
    [Purpose] nvarchar(32) NOT NULL,
    [ExpiresAt] datetimeoffset NOT NULL,
    [UsedAt] datetimeoffset NULL,
    CONSTRAINT [PK_GrowthPreferenceTokens] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthPreferenceTokens_GrowthContactPoints_ContactPointId] FOREIGN KEY ([ContactPointId]) REFERENCES [GrowthContactPoints] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthPrivacyRequests] (
    [Id] bigint NOT NULL IDENTITY,
    [ContactPointId] bigint NOT NULL,
    [StoreId] int NOT NULL,
    [RequestType] nvarchar(16) NOT NULL,
    [State] nvarchar(32) NOT NULL,
    [ReceivedAt] datetimeoffset NOT NULL,
    [ResolvedAt] datetimeoffset NULL,
    [ResolutionJson] nvarchar(max) NULL,
    CONSTRAINT [PK_GrowthPrivacyRequests] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthPrivacyRequests_GrowthContactPoints_ContactPointId] FOREIGN KEY ([ContactPointId]) REFERENCES [GrowthContactPoints] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthSubscriptionInvites] (
    [Id] bigint NOT NULL IDENTITY,
    [ContactPointId] bigint NOT NULL,
    [StoreId] int NOT NULL,
    [ConfirmTokenHash] nvarchar(128) NULL,
    [ExpiresAt] datetimeoffset NOT NULL,
    [ConfirmedAt] datetimeoffset NULL,
    CONSTRAINT [PK_GrowthSubscriptionInvites] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthSubscriptionInvites_GrowthContactPoints_ContactPointId] FOREIGN KEY ([ContactPointId]) REFERENCES [GrowthContactPoints] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthSuppressions] (
    [Id] bigint NOT NULL IDENTITY,
    [ContactPointId] bigint NOT NULL,
    [Scope] nvarchar(16) NOT NULL,
    [StoreId] int NULL,
    [Reason] nvarchar(32) NOT NULL,
    [Source] nvarchar(128) NULL,
    [OccurredAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_GrowthSuppressions] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthSuppressions_GrowthContactPoints_ContactPointId] FOREIGN KEY ([ContactPointId]) REFERENCES [GrowthContactPoints] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthSegmentSnapshots] (
    [Id] bigint NOT NULL IDENTITY,
    [SegmentId] bigint NOT NULL,
    [WatermarkHash] nvarchar(128) NULL,
    [ComputedAt] datetimeoffset NOT NULL,
    [IncludedCount] int NOT NULL,
    [ExcludedCount] int NOT NULL,
    CONSTRAINT [PK_GrowthSegmentSnapshots] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthSegmentSnapshots_GrowthSegments_SegmentId] FOREIGN KEY ([SegmentId]) REFERENCES [GrowthSegments] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MarginIngredientUnitConversions] (
    [Id] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [IngredientId] uniqueidentifier NOT NULL,
    [FromUnitCode] nvarchar(32) NULL,
    [FactorToBase] decimal(18,6) NOT NULL,
    [Version] int NOT NULL,
    [IsActive] bit NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginIngredientUnitConversions] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_MarginIngredientUnitConversions_MarginIngredients_StoreId_IngredientId] FOREIGN KEY ([StoreId], [IngredientId]) REFERENCES [MarginIngredients] ([StoreId], [IngredientId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MarginRecipeProductLinks] (
    [Id] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [RecipeId] uniqueidentifier NOT NULL,
    [ProductId] uniqueidentifier NOT NULL,
    [QuantityPerSoldUnit] decimal(18,6) NOT NULL,
    [EffectiveFrom] datetime2 NOT NULL,
    [EffectiveTo] datetime2 NULL,
    [IsActive] bit NOT NULL,
    [IsBroken] bit NOT NULL,
    [BrokenDetectedAtUtc] datetime2 NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginRecipeProductLinks] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_MarginRecipeProductLinks_MarginRecipes_StoreId_RecipeId] FOREIGN KEY ([StoreId], [RecipeId]) REFERENCES [MarginRecipes] ([StoreId], [RecipeId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MarginRecipeVersions] (
    [RecipeVersionId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [RecipeId] uniqueidentifier NOT NULL,
    [VersionNumber] int NOT NULL,
    [State] nvarchar(16) NOT NULL,
    [YieldQuantity] decimal(18,6) NOT NULL,
    [YieldUnit] nvarchar(16) NOT NULL,
    [PortionCount] int NOT NULL,
    [EffectiveFrom] datetime2 NOT NULL,
    [EffectiveTo] datetime2 NULL,
    [ActivatedAtUtc] datetime2 NULL,
    [RetiredAtUtc] datetime2 NULL,
    [Notes] nvarchar(1024) NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginRecipeVersions] PRIMARY KEY ([RecipeVersionId]),
    CONSTRAINT [AK_MarginRecipeVersions_StoreId_RecipeVersionId] UNIQUE ([StoreId], [RecipeVersionId]),
    CONSTRAINT [FK_MarginRecipeVersions_MarginRecipes_StoreId_RecipeId] FOREIGN KEY ([StoreId], [RecipeId]) REFERENCES [MarginRecipes] ([StoreId], [RecipeId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MarginPriceImportBatches] (
    [BatchId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [SupplierId] uniqueidentifier NULL,
    [FileName] nvarchar(512) NULL,
    [BlobReference] nvarchar(512) NULL,
    [FileSha256] nvarchar(64) NULL,
    [State] nvarchar(16) NOT NULL,
    [RowCount] int NOT NULL,
    [UploadedByReference] nvarchar(256) NULL,
    [UploadedAtUtc] datetime2 NOT NULL,
    [AppliedAtUtc] datetime2 NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginPriceImportBatches] PRIMARY KEY ([BatchId]),
    CONSTRAINT [AK_MarginPriceImportBatches_StoreId_BatchId] UNIQUE ([StoreId], [BatchId]),
    CONSTRAINT [FK_MarginPriceImportBatches_MarginSuppliers_StoreId_SupplierId] FOREIGN KEY ([StoreId], [SupplierId]) REFERENCES [MarginSuppliers] ([StoreId], [SupplierId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MarginPurchaseSpendEntries] (
    [Id] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [StatementId] uniqueidentifier NOT NULL,
    [SpendDate] datetime2 NOT NULL,
    [SupplierId] uniqueidentifier NULL,
    [AmountMinor] bigint NOT NULL,
    [Currency] nvarchar(3) NULL,
    [Note] nvarchar(1024) NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginPurchaseSpendEntries] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_MarginPurchaseSpendEntries_MarginPeriodStatements_StoreId_StatementId] FOREIGN KEY ([StoreId], [StatementId]) REFERENCES [MarginPeriodStatements] ([StoreId], [StatementId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MarginPurchaseSpendEntries_MarginSuppliers_StoreId_SupplierId] FOREIGN KEY ([StoreId], [SupplierId]) REFERENCES [MarginSuppliers] ([StoreId], [SupplierId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MarginSupplierItems] (
    [SupplierItemId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [SupplierId] uniqueidentifier NOT NULL,
    [IngredientId] uniqueidentifier NOT NULL,
    [SupplierArticleNumber] nvarchar(128) NULL,
    [Name] nvarchar(256) NULL,
    [PackSize] decimal(18,6) NULL,
    [PurchaseUnitCode] nvarchar(32) NULL,
    [PurchaseUnitToBaseFactor] decimal(18,6) NULL,
    [IsPreferred] bit NOT NULL,
    [Status] nvarchar(16) NOT NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginSupplierItems] PRIMARY KEY ([SupplierItemId]),
    CONSTRAINT [AK_MarginSupplierItems_StoreId_SupplierItemId] UNIQUE ([StoreId], [SupplierItemId]),
    CONSTRAINT [FK_MarginSupplierItems_MarginIngredients_StoreId_IngredientId] FOREIGN KEY ([StoreId], [IngredientId]) REFERENCES [MarginIngredients] ([StoreId], [IngredientId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MarginSupplierItems_MarginSuppliers_StoreId_SupplierId] FOREIGN KEY ([StoreId], [SupplierId]) REFERENCES [MarginSuppliers] ([StoreId], [SupplierId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MealsAgreements] (
    [AgreementId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [Currency] nchar(3) NOT NULL,
    [SellerLegalName] nvarchar(256) NULL,
    [SellerOrganizationNumber] nvarchar(64) NULL,
    [SellerVatStatus] nvarchar(64) NULL,
    [SellerAddress] nvarchar(512) NULL,
    [PilotPriceTerms] nvarchar(1024) NULL,
    [Status] nvarchar(32) NOT NULL,
    [EffectiveFromUtc] datetime2 NOT NULL,
    [EffectiveToUtc] datetime2 NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsAgreements] PRIMARY KEY ([AgreementId]),
    CONSTRAINT [AK_MealsAgreements_CompanyId_AgreementId] UNIQUE ([CompanyId], [AgreementId]),
    CONSTRAINT [FK_MealsAgreements_MealsCompanies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [MealsCompanies] ([CompanyId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MealsCommandReceipts] (
    [CommandReceiptId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [ScopeKey] nvarchar(256) NOT NULL,
    [IdempotencyKey] nvarchar(256) NOT NULL,
    [RequestHash] nvarchar(128) NOT NULL,
    [ResponseSnapshotJson] nvarchar(max) NULL,
    [ResponseStatusCode] int NULL,
    [CompletedAtUtc] datetime2 NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsCommandReceipts] PRIMARY KEY ([CommandReceiptId]),
    CONSTRAINT [FK_MealsCommandReceipts_MealsCompanies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [MealsCompanies] ([CompanyId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MealsInvitations] (
    [InvitationId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [TokenHash] nvarchar(128) NOT NULL,
    [IntendedContactEmail] nvarchar(256) NULL,
    [IntendedContactPhone] nvarchar(64) NULL,
    [IntendedRole] nvarchar(32) NOT NULL,
    [InviterReference] nvarchar(256) NULL,
    [State] nvarchar(32) NOT NULL,
    [ExpiresAtUtc] datetime2 NOT NULL,
    [ClaimedByApplicationUserId] nvarchar(450) NULL,
    [ClaimedAtUtc] datetime2 NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsInvitations] PRIMARY KEY ([InvitationId]),
    CONSTRAINT [AK_MealsInvitations_CompanyId_InvitationId] UNIQUE ([CompanyId], [InvitationId]),
    CONSTRAINT [FK_MealsInvitations_MealsCompanies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [MealsCompanies] ([CompanyId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MealsStatementRuns] (
    [StatementRunId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [Currency] nchar(3) NOT NULL,
    [PeriodYear] int NOT NULL,
    [PeriodMonth] int NOT NULL,
    [Status] nvarchar(32) NOT NULL,
    [LineCount] int NOT NULL,
    [TotalGrossMinor] bigint NOT NULL,
    [TotalNetMinor] bigint NOT NULL,
    [TotalVatMinor] bigint NOT NULL,
    [ContentHash] nvarchar(128) NULL,
    [FinalizedAtUtc] datetime2 NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsStatementRuns] PRIMARY KEY ([StatementRunId]),
    CONSTRAINT [AK_MealsStatementRuns_CompanyId_StatementRunId] UNIQUE ([CompanyId], [StatementRunId]),
    CONSTRAINT [CK_MealsStatementRuns_Currency] CHECK (LEN([Currency]) = 3),
    CONSTRAINT [CK_MealsStatementRuns_Period] CHECK ([PeriodMonth] >= 1 AND [PeriodMonth] <= 12 AND [PeriodYear] >= 2000),
    CONSTRAINT [FK_MealsStatementRuns_MealsCompanies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [MealsCompanies] ([CompanyId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [TrainingCourseVersions] (
    [CourseVersionId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [CourseId] uniqueidentifier NOT NULL,
    [VersionNo] int NOT NULL,
    [ContentPagesJson] nvarchar(max) NULL,
    [QuizJson] nvarchar(max) NULL,
    [PassThresholdPercent] int NOT NULL,
    [ContentHash] nvarchar(128) NULL,
    [State] nvarchar(32) NOT NULL,
    [PublishedAtUtc] datetime2 NULL,
    [RetiredAtUtc] datetime2 NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_TrainingCourseVersions] PRIMARY KEY ([CourseVersionId]),
    CONSTRAINT [AK_TrainingCourseVersions_StoreId_CourseVersionId] UNIQUE ([StoreId], [CourseVersionId]),
    CONSTRAINT [CK_TrainingCourseVersions_PassThreshold] CHECK ([PassThresholdPercent] >= 0 AND [PassThresholdPercent] <= 100),
    CONSTRAINT [FK_TrainingCourseVersions_TrainingCourses_StoreId_CourseId] FOREIGN KEY ([StoreId], [CourseId]) REFERENCES [TrainingCourses] ([StoreId], [CourseId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceStaffMembers] (
    [StaffMemberId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [WorkforcePersonId] uniqueidentifier NOT NULL,
    [LegalEmployerId] uniqueidentifier NOT NULL,
    [EmployerEffectiveFromUtc] datetime2 NOT NULL,
    [EmployerEffectiveToUtc] datetime2 NULL,
    [OperatorId] int NULL,
    [EmploymentNumber] nvarchar(64) NULL,
    [PayrollNumber] nvarchar(64) NULL,
    [CapabilityGrants] int NOT NULL,
    [ActiveFromUtc] datetime2 NOT NULL,
    [ActiveToUtc] datetime2 NULL,
    [IsActive] bit NOT NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceStaffMembers] PRIMARY KEY ([StaffMemberId]),
    CONSTRAINT [AK_WorkforceStaffMembers_StoreId_StaffMemberId] UNIQUE ([StoreId], [StaffMemberId]),
    CONSTRAINT [FK_WorkforceStaffMembers_WorkforceLegalEmployers_LegalEmployerId] FOREIGN KEY ([LegalEmployerId]) REFERENCES [WorkforceLegalEmployers] ([LegalEmployerId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_WorkforceStaffMembers_WorkforcePersons_WorkforcePersonId] FOREIGN KEY ([WorkforcePersonId]) REFERENCES [WorkforcePersons] ([WorkforcePersonId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforcePolicyEvidence] (
    [Id] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [EvidenceType] nvarchar(32) NOT NULL,
    [Scope] nvarchar(256) NULL,
    [IssuingParty] nvarchar(256) NULL,
    [Detail] nvarchar(max) NULL,
    [ProtectedDocumentRef] nvarchar(256) NULL,
    [EffectiveFromUtc] datetime2 NOT NULL,
    [ExpiresAtUtc] datetime2 NULL,
    [RuleSetVersionId] uniqueidentifier NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforcePolicyEvidence] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_WorkforcePolicyEvidence_WorkforceRuleSetVersions_RuleSetVersionId] FOREIGN KEY ([RuleSetVersionId]) REFERENCES [WorkforceRuleSetVersions] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceSchedulePublications] (
    [SchedulePublicationId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [ScheduleRevisionId] uniqueidentifier NOT NULL,
    [PublicationNumber] int NOT NULL,
    [SupersedesPublicationId] uniqueidentifier NULL,
    [ContentHash] nvarchar(128) NULL,
    [PublishedByActorReference] nvarchar(256) NULL,
    [PublishedAtUtc] datetime2 NOT NULL,
    [RuleSetVersionId] uniqueidentifier NULL,
    [LegalEmployerId] uniqueidentifier NULL,
    [TimeZoneId] nvarchar(64) NULL,
    [CountryCode] nvarchar(16) NULL,
    [Region] nvarchar(64) NULL,
    [RangeStartUtc] datetime2 NOT NULL,
    [RangeEndUtc] datetime2 NOT NULL,
    [SnapshotJson] nvarchar(max) NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceSchedulePublications] PRIMARY KEY ([SchedulePublicationId]),
    CONSTRAINT [AK_WorkforceSchedulePublications_StoreId_SchedulePublicationId] UNIQUE ([StoreId], [SchedulePublicationId]),
    CONSTRAINT [FK_WorkforceSchedulePublications_WorkforceScheduleRevisions_StoreId_ScheduleRevisionId] FOREIGN KEY ([StoreId], [ScheduleRevisionId]) REFERENCES [WorkforceScheduleRevisions] ([StoreId], [ScheduleRevisionId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceScheduleValidationReceipts] (
    [ValidationReceiptId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [ScheduleRevisionId] uniqueidentifier NOT NULL,
    [DraftChecksum] nvarchar(128) NULL,
    [DependencyVersionsJson] nvarchar(max) NULL,
    [RuleSetVersionId] uniqueidentifier NULL,
    [TimeZoneId] nvarchar(64) NULL,
    [RuleResultsJson] nvarchar(max) NULL,
    [IsValid] bit NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceScheduleValidationReceipts] PRIMARY KEY ([ValidationReceiptId]),
    CONSTRAINT [FK_WorkforceScheduleValidationReceipts_WorkforceScheduleRevisions_StoreId_ScheduleRevisionId] FOREIGN KEY ([StoreId], [ScheduleRevisionId]) REFERENCES [WorkforceScheduleRevisions] ([StoreId], [ScheduleRevisionId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [EventsNotes] (
    [Id] int NOT NULL IDENTITY,
    [EventId] int NOT NULL,
    [AuthorUserId] nvarchar(450) NULL,
    [Body] nvarchar(max) NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_EventsNotes] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EventsNotes_AspNetUsers_AuthorUserId] FOREIGN KEY ([AuthorUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_EventsNotes_EventsEvents_EventId] FOREIGN KEY ([EventId]) REFERENCES [EventsEvents] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [EventsProposalVersions] (
    [Id] int NOT NULL IDENTITY,
    [EventId] int NOT NULL,
    [VersionNo] int NOT NULL,
    [Status] nvarchar(32) NOT NULL,
    [CurrencyCode] nvarchar(3) NULL,
    [TotalMinor] bigint NOT NULL,
    [MinimumSpendMinor] bigint NOT NULL,
    [RoomFeeMinor] bigint NOT NULL,
    [DepositRequiredMinor] bigint NOT NULL,
    [TermsText] nvarchar(max) NULL,
    [ExpiresAtUtc] datetime2 NULL,
    [PublicToken] uniqueidentifier NOT NULL,
    [ContentHash] nvarchar(128) NULL,
    [CreatedByUserId] nvarchar(128) NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    [SentAtUtc] datetime2 NULL,
    CONSTRAINT [PK_EventsProposalVersions] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EventsProposalVersions_EventsEvents_EventId] FOREIGN KEY ([EventId]) REFERENCES [EventsEvents] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [EventsSettlements] (
    [Id] int NOT NULL IDENTITY,
    [EventId] int NOT NULL,
    [Status] nvarchar(32) NOT NULL,
    [StatementTotalMinor] bigint NOT NULL,
    [ReconciledAtUtc] datetime2 NULL,
    [ClosedAtUtc] datetime2 NULL,
    [ClosedByUserId] nvarchar(128) NULL,
    [RowVersion] rowversion NULL,
    CONSTRAINT [PK_EventsSettlements] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EventsSettlements_EventsEvents_EventId] FOREIGN KEY ([EventId]) REFERENCES [EventsEvents] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [EventsStateTransitions] (
    [Id] int NOT NULL IDENTITY,
    [EventId] int NOT NULL,
    [FromStatus] nvarchar(32) NULL,
    [ToStatus] nvarchar(32) NOT NULL,
    [Action] nvarchar(64) NULL,
    [ActorKind] nvarchar(16) NOT NULL,
    [ActorUserId] nvarchar(128) NULL,
    [ReasonCode] nvarchar(64) NULL,
    [Note] nvarchar(2048) NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_EventsStateTransitions] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EventsStateTransitions_EventsEvents_EventId] FOREIGN KEY ([EventId]) REFERENCES [EventsEvents] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthNewsletterVersions] (
    [Id] bigint NOT NULL IDENTITY,
    [NewsletterId] bigint NOT NULL,
    [VersionNo] int NOT NULL,
    [Subject] nvarchar(512) NULL,
    [ContentJson] nvarchar(max) NULL,
    [PlainTextAlternative] nvarchar(max) NULL,
    [ContentHash] nvarchar(128) NULL,
    [SegmentSnapshotId] bigint NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_GrowthNewsletterVersions] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthNewsletterVersions_GrowthNewsletters_NewsletterId] FOREIGN KEY ([NewsletterId]) REFERENCES [GrowthNewsletters] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_GrowthNewsletterVersions_GrowthSegmentSnapshots_SegmentSnapshotId] FOREIGN KEY ([SegmentSnapshotId]) REFERENCES [GrowthSegmentSnapshots] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthSegmentSnapshotMembers] (
    [Id] bigint NOT NULL IDENTITY,
    [SnapshotId] bigint NOT NULL,
    [ContactPointId] bigint NOT NULL,
    [Included] bit NOT NULL,
    [Reason] nvarchar(64) NULL,
    CONSTRAINT [PK_GrowthSegmentSnapshotMembers] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthSegmentSnapshotMembers_GrowthContactPoints_ContactPointId] FOREIGN KEY ([ContactPointId]) REFERENCES [GrowthContactPoints] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_GrowthSegmentSnapshotMembers_GrowthSegmentSnapshots_SnapshotId] FOREIGN KEY ([SnapshotId]) REFERENCES [GrowthSegmentSnapshots] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MarginRecipeComponents] (
    [Id] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [RecipeVersionId] uniqueidentifier NOT NULL,
    [IngredientId] uniqueidentifier NULL,
    [SubRecipeId] uniqueidentifier NULL,
    [Quantity] decimal(18,6) NOT NULL,
    [UnitCode] nvarchar(32) NULL,
    [YieldFactor] decimal(18,6) NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginRecipeComponents] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_MarginRecipeComponents_IngredientXorSubRecipe] CHECK (([IngredientId] IS NOT NULL AND [SubRecipeId] IS NULL) OR ([IngredientId] IS NULL AND [SubRecipeId] IS NOT NULL)),
    CONSTRAINT [FK_MarginRecipeComponents_MarginIngredients_StoreId_IngredientId] FOREIGN KEY ([StoreId], [IngredientId]) REFERENCES [MarginIngredients] ([StoreId], [IngredientId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MarginRecipeComponents_MarginRecipeVersions_StoreId_RecipeVersionId] FOREIGN KEY ([StoreId], [RecipeVersionId]) REFERENCES [MarginRecipeVersions] ([StoreId], [RecipeVersionId]) ON DELETE CASCADE,
    CONSTRAINT [FK_MarginRecipeComponents_MarginRecipes_StoreId_SubRecipeId] FOREIGN KEY ([StoreId], [SubRecipeId]) REFERENCES [MarginRecipes] ([StoreId], [RecipeId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MarginPriceImportRows] (
    [Id] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [BatchId] uniqueidentifier NOT NULL,
    [RowNumber] int NOT NULL,
    [RawLine] nvarchar(4000) NULL,
    [ParsedArticleNumber] nvarchar(128) NULL,
    [ParsedName] nvarchar(256) NULL,
    [ParsedPriceMinor] bigint NULL,
    [ParsedCurrency] nvarchar(3) NULL,
    [ParsedUnitCode] nvarchar(32) NULL,
    [ProposedSupplierItemId] uniqueidentifier NULL,
    [ResolvedSupplierItemId] uniqueidentifier NULL,
    [Resolution] nvarchar(16) NOT NULL,
    [RowError] nvarchar(1024) NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginPriceImportRows] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_MarginPriceImportRows_MarginPriceImportBatches_StoreId_BatchId] FOREIGN KEY ([StoreId], [BatchId]) REFERENCES [MarginPriceImportBatches] ([StoreId], [BatchId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MarginPriceImportRows_MarginSupplierItems_StoreId_ResolvedSupplierItemId] FOREIGN KEY ([StoreId], [ResolvedSupplierItemId]) REFERENCES [MarginSupplierItems] ([StoreId], [SupplierItemId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MarginSupplierItemPrices] (
    [Id] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [SupplierItemId] uniqueidentifier NOT NULL,
    [EffectiveFrom] datetime2 NOT NULL,
    [EffectiveTo] datetime2 NULL,
    [PriceMinor] bigint NOT NULL,
    [Currency] nvarchar(3) NULL,
    [Source] nvarchar(16) NOT NULL,
    [ImportBatchId] uniqueidentifier NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MarginSupplierItemPrices] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_MarginSupplierItemPrices_MarginPriceImportBatches_StoreId_ImportBatchId] FOREIGN KEY ([StoreId], [ImportBatchId]) REFERENCES [MarginPriceImportBatches] ([StoreId], [BatchId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MarginSupplierItemPrices_MarginSupplierItems_StoreId_SupplierItemId] FOREIGN KEY ([StoreId], [SupplierItemId]) REFERENCES [MarginSupplierItems] ([StoreId], [SupplierItemId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MealsPrograms] (
    [ProgramId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [AgreementId] uniqueidentifier NOT NULL,
    [Name] nvarchar(256) NULL,
    [Status] nvarchar(32) NOT NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsPrograms] PRIMARY KEY ([ProgramId]),
    CONSTRAINT [AK_MealsPrograms_CompanyId_ProgramId] UNIQUE ([CompanyId], [ProgramId]),
    CONSTRAINT [FK_MealsPrograms_MealsAgreements_CompanyId_AgreementId] FOREIGN KEY ([CompanyId], [AgreementId]) REFERENCES [MealsAgreements] ([CompanyId], [AgreementId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealsPrograms_MealsCompanies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [MealsCompanies] ([CompanyId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MealsMemberships] (
    [MembershipId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [ApplicationUserId] nvarchar(450) NULL,
    [Role] nvarchar(32) NOT NULL,
    [State] nvarchar(32) NOT NULL,
    [ClaimedFromInvitationId] uniqueidentifier NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsMemberships] PRIMARY KEY ([MembershipId]),
    CONSTRAINT [AK_MealsMemberships_CompanyId_MembershipId] UNIQUE ([CompanyId], [MembershipId]),
    CONSTRAINT [FK_MealsMemberships_MealsCompanies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [MealsCompanies] ([CompanyId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealsMemberships_MealsInvitations_CompanyId_ClaimedFromInvitationId] FOREIGN KEY ([CompanyId], [ClaimedFromInvitationId]) REFERENCES [MealsInvitations] ([CompanyId], [InvitationId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MealsStatementLines] (
    [StatementLineId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [StatementRunId] uniqueidentifier NOT NULL,
    [AllocationId] uniqueidentifier NOT NULL,
    [Kind] nvarchar(32) NOT NULL,
    [OrderId] int NOT NULL,
    [SourceReceiptNumber] bigint NULL,
    [MemberDisplayRef] nvarchar(256) NULL,
    [GrossMinor] bigint NOT NULL,
    [NetMinor] bigint NOT NULL,
    [VatMinor] bigint NOT NULL,
    [VatLinesJson] nvarchar(max) NULL,
    [Currency] nchar(3) NOT NULL,
    [OrderOccurredAtUtc] datetime2 NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsStatementLines] PRIMARY KEY ([StatementLineId]),
    CONSTRAINT [CK_MealsStatementLines_Currency] CHECK (LEN([Currency]) = 3),
    CONSTRAINT [FK_MealsStatementLines_MealsCompanies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [MealsCompanies] ([CompanyId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealsStatementLines_MealsStatementRuns_CompanyId_StatementRunId] FOREIGN KEY ([CompanyId], [StatementRunId]) REFERENCES [MealsStatementRuns] ([CompanyId], [StatementRunId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [TrainingAssignments] (
    [AssignmentId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [CourseVersionId] uniqueidentifier NOT NULL,
    [Scope] nvarchar(32) NOT NULL,
    [RoleRef] uniqueidentifier NULL,
    [PersonRef] uniqueidentifier NULL,
    [DueDateUtc] datetime2 NULL,
    [AssignedByReference] nvarchar(256) NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_TrainingAssignments] PRIMARY KEY ([AssignmentId]),
    CONSTRAINT [CK_TrainingAssignments_ScopeReference] CHECK (([Scope] = 'Role' AND [RoleRef] IS NOT NULL AND [PersonRef] IS NULL) OR ([Scope] = 'Person' AND [PersonRef] IS NOT NULL AND [RoleRef] IS NULL)),
    CONSTRAINT [FK_TrainingAssignments_TrainingCourseVersions_StoreId_CourseVersionId] FOREIGN KEY ([StoreId], [CourseVersionId]) REFERENCES [TrainingCourseVersions] ([StoreId], [CourseVersionId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceAvailabilityExceptions] (
    [AvailabilityExceptionId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [StaffMemberId] uniqueidentifier NOT NULL,
    [Kind] nvarchar(16) NOT NULL,
    [StartsUtc] datetime2 NOT NULL,
    [EndsUtc] datetime2 NOT NULL,
    [LocalDate] datetime2 NOT NULL,
    [Note] nvarchar(1024) NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceAvailabilityExceptions] PRIMARY KEY ([AvailabilityExceptionId]),
    CONSTRAINT [CK_WorkforceAvailabilityExceptions_Bounds] CHECK ([StartsUtc] < [EndsUtc]),
    CONSTRAINT [FK_WorkforceAvailabilityExceptions_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceAvailabilityRules] (
    [AvailabilityRuleId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [StaffMemberId] uniqueidentifier NOT NULL,
    [Kind] nvarchar(16) NOT NULL,
    [DayOfWeek] int NOT NULL,
    [StartMinuteOfDay] int NOT NULL,
    [EndMinuteOfDay] int NOT NULL,
    [EffectiveFromUtc] datetime2 NOT NULL,
    [EffectiveToUtc] datetime2 NULL,
    [CutoffHoursBeforeShift] int NULL,
    [SupersedesRuleId] uniqueidentifier NULL,
    [IsSuperseded] bit NOT NULL,
    [Version] bigint NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceAvailabilityRules] PRIMARY KEY ([AvailabilityRuleId]),
    CONSTRAINT [FK_WorkforceAvailabilityRules_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceClockEvents] (
    [ClockEventId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [ClientEventId] nvarchar(256) NOT NULL,
    [Source] nvarchar(16) NOT NULL,
    [EventType] nvarchar(16) NOT NULL,
    [StaffMemberId] uniqueidentifier NOT NULL,
    [DeviceReference] nvarchar(256) NULL,
    [OperatorReference] nvarchar(256) NULL,
    [EventUtc] datetime2 NOT NULL,
    [ServerReceivedUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceClockEvents] PRIMARY KEY ([ClockEventId]),
    CONSTRAINT [FK_WorkforceClockEvents_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceClockSessions] (
    [ClockSessionId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [StaffMemberId] uniqueidentifier NOT NULL,
    [WorkforcePersonId] uniqueidentifier NOT NULL,
    [LegalEmployerId] uniqueidentifier NOT NULL,
    [OpenedUtc] datetime2 NOT NULL,
    [ClosedUtc] datetime2 NULL,
    [OpenClockEventId] uniqueidentifier NOT NULL,
    [CloseClockEventId] uniqueidentifier NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceClockSessions] PRIMARY KEY ([ClockSessionId]),
    CONSTRAINT [AK_WorkforceClockSessions_StoreId_ClockSessionId] UNIQUE ([StoreId], [ClockSessionId]),
    CONSTRAINT [FK_WorkforceClockSessions_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceEmploymentTerms] (
    [Id] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [StaffMemberId] uniqueidentifier NOT NULL,
    [EffectiveFromUtc] datetime2 NOT NULL,
    [EffectiveToUtc] datetime2 NULL,
    [ContractMinutesPerWeek] int NULL,
    [ContractPercentage] decimal(5,2) NULL,
    [EmploymentCategory] nvarchar(64) NULL,
    [PayCode] nvarchar(64) NULL,
    [CostCenter] nvarchar(64) NULL,
    [WageAmount] decimal(18,4) NULL,
    [WageCurrency] nvarchar(3) NULL,
    [WageInterval] nvarchar(32) NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceEmploymentTerms] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_WorkforceEmploymentTerms_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceInboxItems] (
    [InboxItemId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [StaffMemberId] uniqueidentifier NOT NULL,
    [LogicalEventKey] nvarchar(256) NULL,
    [EntityType] nvarchar(128) NULL,
    [EntityReference] nvarchar(256) NULL,
    [SchedulePublicationId] uniqueidentifier NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceInboxItems] PRIMARY KEY ([InboxItemId]),
    CONSTRAINT [FK_WorkforceInboxItems_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceInvitations] (
    [InvitationId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [StaffMemberId] uniqueidentifier NOT NULL,
    [TokenHash] nvarchar(128) NULL,
    [State] nvarchar(32) NOT NULL,
    [ExpiresAtUtc] datetime2 NOT NULL,
    [ClaimedByApplicationUserId] nvarchar(450) NULL,
    [ClaimedAtUtc] datetime2 NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceInvitations] PRIMARY KEY ([InvitationId]),
    CONSTRAINT [FK_WorkforceInvitations_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforcePersonnelListParticipants] (
    [ParticipantId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [Category] nvarchar(32) NOT NULL,
    [StaffMemberId] uniqueidentifier NULL,
    [ParticipantName] nvarchar(256) NULL,
    [ProtectedIdentityCodeRef] nvarchar(256) NULL,
    [HiredInOrganizationNumber] nvarchar(64) NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforcePersonnelListParticipants] PRIMARY KEY ([ParticipantId]),
    CONSTRAINT [AK_WorkforcePersonnelListParticipants_StoreId_ParticipantId] UNIQUE ([StoreId], [ParticipantId]),
    CONSTRAINT [FK_WorkforcePersonnelListParticipants_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceShiftAssignments] (
    [ShiftAssignmentId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [ScheduleRevisionId] uniqueidentifier NOT NULL,
    [StaffMemberId] uniqueidentifier NULL,
    [RoleId] uniqueidentifier NULL,
    [StartsUtc] datetime2 NOT NULL,
    [EndsUtc] datetime2 NOT NULL,
    [LocalBusinessDate] datetime2 NOT NULL,
    [StartOffsetMinutes] int NOT NULL,
    [EndOffsetMinutes] int NOT NULL,
    [PaidBreakMinutes] int NOT NULL,
    [UnpaidBreakMinutes] int NOT NULL,
    [Note] nvarchar(1024) NULL,
    [State] nvarchar(32) NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceShiftAssignments] PRIMARY KEY ([ShiftAssignmentId]),
    CONSTRAINT [AK_WorkforceShiftAssignments_StoreId_ShiftAssignmentId] UNIQUE ([StoreId], [ShiftAssignmentId]),
    CONSTRAINT [CK_WorkforceShiftAssignments_Bounds] CHECK ([StartsUtc] < [EndsUtc]),
    CONSTRAINT [CK_WorkforceShiftAssignments_Breaks] CHECK ([PaidBreakMinutes] >= 0 AND [PaidBreakMinutes] <= 1440 AND [UnpaidBreakMinutes] >= 0 AND [UnpaidBreakMinutes] <= 1440),
    CONSTRAINT [FK_WorkforceShiftAssignments_WorkforceRoles_StoreId_RoleId] FOREIGN KEY ([StoreId], [RoleId]) REFERENCES [WorkforceRoles] ([StoreId], [RoleId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_WorkforceShiftAssignments_WorkforceScheduleRevisions_StoreId_ScheduleRevisionId] FOREIGN KEY ([StoreId], [ScheduleRevisionId]) REFERENCES [WorkforceScheduleRevisions] ([StoreId], [ScheduleRevisionId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_WorkforceShiftAssignments_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceStaffRoles] (
    [Id] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [StaffMemberId] uniqueidentifier NOT NULL,
    [RoleId] uniqueidentifier NOT NULL,
    [Skills] nvarchar(1024) NULL,
    [SkillExpiryUtc] datetime2 NULL,
    [EffectiveFromUtc] datetime2 NOT NULL,
    [EffectiveToUtc] datetime2 NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceStaffRoles] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_WorkforceStaffRoles_WorkforceRoles_StoreId_RoleId] FOREIGN KEY ([StoreId], [RoleId]) REFERENCES [WorkforceRoles] ([StoreId], [RoleId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_WorkforceStaffRoles_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceTimeOffRequests] (
    [TimeOffRequestId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [StaffMemberId] uniqueidentifier NOT NULL,
    [StartsUtc] datetime2 NOT NULL,
    [EndsUtc] datetime2 NOT NULL,
    [LocalStartDate] datetime2 NOT NULL,
    [LocalEndDate] datetime2 NOT NULL,
    [Reason] nvarchar(1024) NULL,
    [Status] nvarchar(32) NOT NULL,
    [Visibility] nvarchar(16) NOT NULL,
    [DecisionByActorReference] nvarchar(256) NULL,
    [DecidedAtUtc] datetime2 NULL,
    [DecisionNote] nvarchar(1024) NULL,
    [FirstAffectedScheduleRevisionId] uniqueidentifier NULL,
    [ExpiresAtUtc] datetime2 NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceTimeOffRequests] PRIMARY KEY ([TimeOffRequestId]),
    CONSTRAINT [CK_WorkforceTimeOffRequests_Bounds] CHECK ([StartsUtc] < [EndsUtc]),
    CONSTRAINT [FK_WorkforceTimeOffRequests_WorkforceScheduleRevisions_StoreId_FirstAffectedScheduleRevisionId] FOREIGN KEY ([StoreId], [FirstAffectedScheduleRevisionId]) REFERENCES [WorkforceScheduleRevisions] ([StoreId], [ScheduleRevisionId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_WorkforceTimeOffRequests_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceSchedulePublicationReceipts] (
    [PublicationReceiptId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [SchedulePublicationId] uniqueidentifier NOT NULL,
    [StaffMemberId] uniqueidentifier NOT NULL,
    [ReceiptType] nvarchar(32) NULL,
    [OccurredAtUtc] datetime2 NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceSchedulePublicationReceipts] PRIMARY KEY ([PublicationReceiptId]),
    CONSTRAINT [FK_WorkforceSchedulePublicationReceipts_WorkforceSchedulePublications_StoreId_SchedulePublicationId] FOREIGN KEY ([StoreId], [SchedulePublicationId]) REFERENCES [WorkforceSchedulePublications] ([StoreId], [SchedulePublicationId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_WorkforceSchedulePublicationReceipts_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceSchedulePublicationRecipients] (
    [PublicationRecipientId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [SchedulePublicationId] uniqueidentifier NOT NULL,
    [StaffMemberId] uniqueidentifier NOT NULL,
    [ClaimedByApplicationUserId] nvarchar(450) NULL,
    [Channel] nvarchar(16) NOT NULL,
    [DeliveryState] nvarchar(32) NOT NULL,
    [SeenAtUtc] datetime2 NULL,
    [AcknowledgedAtUtc] datetime2 NULL,
    [ManuallyDeliveredAtUtc] datetime2 NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceSchedulePublicationRecipients] PRIMARY KEY ([PublicationRecipientId]),
    CONSTRAINT [FK_WorkforceSchedulePublicationRecipients_WorkforceSchedulePublications_StoreId_SchedulePublicationId] FOREIGN KEY ([StoreId], [SchedulePublicationId]) REFERENCES [WorkforceSchedulePublications] ([StoreId], [SchedulePublicationId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_WorkforceSchedulePublicationRecipients_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [EventsAcceptanceReceipts] (
    [Id] int NOT NULL IDENTITY,
    [EventId] int NOT NULL,
    [ProposalVersionId] int NOT NULL,
    [ProposalContentHash] nvarchar(128) NULL,
    [AcceptorName] nvarchar(256) NULL,
    [AcceptorEmail] nvarchar(256) NULL,
    [AcceptorIp] nvarchar(64) NULL,
    [UserAgent] nvarchar(512) NULL,
    [AcceptedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_EventsAcceptanceReceipts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EventsAcceptanceReceipts_EventsEvents_EventId] FOREIGN KEY ([EventId]) REFERENCES [EventsEvents] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_EventsAcceptanceReceipts_EventsProposalVersions_ProposalVersionId] FOREIGN KEY ([ProposalVersionId]) REFERENCES [EventsProposalVersions] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [EventsDeposits] (
    [Id] int NOT NULL IDENTITY,
    [EventId] int NOT NULL,
    [ProposalVersionId] int NOT NULL,
    [Status] nvarchar(32) NOT NULL,
    [AmountMinor] bigint NOT NULL,
    [CurrencyCode] nvarchar(3) NULL,
    [PaymentType] nvarchar(32) NOT NULL,
    [PaymentIntentId] nvarchar(256) NULL,
    [VippsOrderId] nvarchar(256) NULL,
    [DinteroSessionId] nvarchar(256) NULL,
    [DinteroTransactionId] nvarchar(256) NULL,
    [SurfboardOrderId] nvarchar(256) NULL,
    [SurfboardPaymentId] nvarchar(256) NULL,
    [PublicToken] uniqueidentifier NOT NULL,
    [ProviderRedirectUrl] nvarchar(2048) NULL,
    [RequestedAtUtc] datetime2 NOT NULL,
    [ExpiresAtUtc] datetime2 NULL,
    [PaidAtUtc] datetime2 NULL,
    [RefundedMinor] bigint NOT NULL,
    [RowVersion] rowversion NULL,
    CONSTRAINT [PK_EventsDeposits] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EventsDeposits_EventsEvents_EventId] FOREIGN KEY ([EventId]) REFERENCES [EventsEvents] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_EventsDeposits_EventsProposalVersions_ProposalVersionId] FOREIGN KEY ([ProposalVersionId]) REFERENCES [EventsProposalVersions] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [EventsProposalLines] (
    [Id] int NOT NULL IDENTITY,
    [ProposalVersionId] int NOT NULL,
    [LineNo] int NOT NULL,
    [Kind] nvarchar(32) NOT NULL,
    [Description] nvarchar(1024) NULL,
    [Quantity] decimal(18,3) NOT NULL,
    [UnitPriceMinor] bigint NOT NULL,
    [AmountMinor] bigint NOT NULL,
    [VatRate] decimal(6,4) NOT NULL,
    CONSTRAINT [PK_EventsProposalLines] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EventsProposalLines_EventsProposalVersions_ProposalVersionId] FOREIGN KEY ([ProposalVersionId]) REFERENCES [EventsProposalVersions] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [EventsRunSheets] (
    [Id] int NOT NULL IDENTITY,
    [EventId] int NOT NULL,
    [VersionNo] int NOT NULL,
    [Status] nvarchar(32) NOT NULL,
    [GeneratedFromProposalVersionId] int NOT NULL,
    [IssuedByUserId] nvarchar(128) NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    [IssuedAtUtc] datetime2 NULL,
    CONSTRAINT [PK_EventsRunSheets] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EventsRunSheets_EventsEvents_EventId] FOREIGN KEY ([EventId]) REFERENCES [EventsEvents] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_EventsRunSheets_EventsProposalVersions_GeneratedFromProposalVersionId] FOREIGN KEY ([GeneratedFromProposalVersionId]) REFERENCES [EventsProposalVersions] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [EventsSettlementLines] (
    [Id] int NOT NULL IDENTITY,
    [SettlementId] int NOT NULL,
    [LineNo] int NOT NULL,
    [Kind] nvarchar(32) NOT NULL,
    [SourceKind] nvarchar(32) NOT NULL,
    [SourceReference] nvarchar(256) NULL,
    [AmountMinor] bigint NOT NULL,
    [TruthAmountMinor] bigint NULL,
    [MatchState] nvarchar(16) NOT NULL,
    [Note] nvarchar(2048) NULL,
    [AdjustmentReason] nvarchar(512) NULL,
    CONSTRAINT [PK_EventsSettlementLines] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EventsSettlementLines_EventsSettlements_SettlementId] FOREIGN KEY ([SettlementId]) REFERENCES [EventsSettlements] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthDispatchRuns] (
    [Id] bigint NOT NULL IDENTITY,
    [NewsletterVersionId] bigint NOT NULL,
    [DispatchHash] nvarchar(128) NULL,
    [State] nvarchar(32) NOT NULL,
    [FinalEligibleCount] int NOT NULL,
    [SuppressedAtDispatchCount] int NOT NULL,
    [ProviderAcceptedCount] int NOT NULL,
    [DeliveredCount] int NOT NULL,
    [FailedCount] int NOT NULL,
    [AmbiguousCount] int NOT NULL,
    [OpenedCount] int NOT NULL,
    [StartedAt] datetimeoffset NOT NULL,
    [CompletedAt] datetimeoffset NULL,
    CONSTRAINT [PK_GrowthDispatchRuns] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthDispatchRuns_GrowthNewsletterVersions_NewsletterVersionId] FOREIGN KEY ([NewsletterVersionId]) REFERENCES [GrowthNewsletterVersions] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthNewsletterApprovals] (
    [Id] bigint NOT NULL IDENTITY,
    [NewsletterVersionId] bigint NOT NULL,
    [ContentHash] nvarchar(128) NULL,
    [SegmentSnapshotId] bigint NOT NULL,
    [ApproverUserId] nvarchar(450) NULL,
    [ApprovedAt] datetimeoffset NOT NULL,
    [InvalidatedAt] datetimeoffset NULL,
    CONSTRAINT [PK_GrowthNewsletterApprovals] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthNewsletterApprovals_GrowthNewsletterVersions_NewsletterVersionId] FOREIGN KEY ([NewsletterVersionId]) REFERENCES [GrowthNewsletterVersions] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_GrowthNewsletterApprovals_GrowthSegmentSnapshots_SegmentSnapshotId] FOREIGN KEY ([SegmentSnapshotId]) REFERENCES [GrowthSegmentSnapshots] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MealsPolicyVersions] (
    [PolicyVersionId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [ProgramId] uniqueidentifier NOT NULL,
    [Version] int NOT NULL,
    [AllowanceMinor] bigint NOT NULL,
    [Currency] nchar(3) NOT NULL,
    [PeriodKind] nvarchar(32) NOT NULL,
    [EligibleWeekdaysMask] int NOT NULL,
    [LocalWindowStartMinutes] int NOT NULL,
    [LocalWindowEndMinutes] int NOT NULL,
    [TimeZoneId] nvarchar(64) NULL,
    [EffectiveFromUtc] datetime2 NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsPolicyVersions] PRIMARY KEY ([PolicyVersionId]),
    CONSTRAINT [AK_MealsPolicyVersions_CompanyId_PolicyVersionId] UNIQUE ([CompanyId], [PolicyVersionId]),
    CONSTRAINT [CK_MealsPolicyVersions_AllowanceNonNegative] CHECK ([AllowanceMinor] >= 0),
    CONSTRAINT [CK_MealsPolicyVersions_Currency] CHECK (LEN([Currency]) = 3),
    CONSTRAINT [CK_MealsPolicyVersions_Window] CHECK ([LocalWindowStartMinutes] < [LocalWindowEndMinutes]),
    CONSTRAINT [FK_MealsPolicyVersions_MealsCompanies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [MealsCompanies] ([CompanyId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealsPolicyVersions_MealsPrograms_CompanyId_ProgramId] FOREIGN KEY ([CompanyId], [ProgramId]) REFERENCES [MealsPrograms] ([CompanyId], [ProgramId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MealsBudgetGuards] (
    [BudgetGuardId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [ProgramId] uniqueidentifier NOT NULL,
    [MembershipId] uniqueidentifier NOT NULL,
    [PeriodKey] nvarchar(16) NOT NULL,
    [ReservedMinor] bigint NOT NULL,
    [CapturedMinor] bigint NOT NULL,
    [Currency] nchar(3) NOT NULL,
    [ConcurrencyVersion] bigint NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsBudgetGuards] PRIMARY KEY ([BudgetGuardId]),
    CONSTRAINT [CK_MealsBudgetGuards_CapturedNonNegative] CHECK ([CapturedMinor] >= 0),
    CONSTRAINT [CK_MealsBudgetGuards_CapturedWithinReserved] CHECK ([CapturedMinor] <= [ReservedMinor]),
    CONSTRAINT [CK_MealsBudgetGuards_Currency] CHECK (LEN([Currency]) = 3),
    CONSTRAINT [CK_MealsBudgetGuards_ReservedNonNegative] CHECK ([ReservedMinor] >= 0),
    CONSTRAINT [FK_MealsBudgetGuards_MealsCompanies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [MealsCompanies] ([CompanyId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealsBudgetGuards_MealsMemberships_CompanyId_MembershipId] FOREIGN KEY ([CompanyId], [MembershipId]) REFERENCES [MealsMemberships] ([CompanyId], [MembershipId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealsBudgetGuards_MealsPrograms_CompanyId_ProgramId] FOREIGN KEY ([CompanyId], [ProgramId]) REFERENCES [MealsPrograms] ([CompanyId], [ProgramId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MealsProgramMembers] (
    [ProgramMemberId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [ProgramId] uniqueidentifier NOT NULL,
    [MembershipId] uniqueidentifier NOT NULL,
    [State] nvarchar(32) NOT NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsProgramMembers] PRIMARY KEY ([ProgramMemberId]),
    CONSTRAINT [FK_MealsProgramMembers_MealsCompanies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [MealsCompanies] ([CompanyId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealsProgramMembers_MealsMemberships_CompanyId_MembershipId] FOREIGN KEY ([CompanyId], [MembershipId]) REFERENCES [MealsMemberships] ([CompanyId], [MembershipId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealsProgramMembers_MealsPrograms_CompanyId_ProgramId] FOREIGN KEY ([CompanyId], [ProgramId]) REFERENCES [MealsPrograms] ([CompanyId], [ProgramId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceAttendanceAdjustments] (
    [AttendanceAdjustmentId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [ClockSessionId] uniqueidentifier NOT NULL,
    [AdjustedField] nvarchar(64) NULL,
    [OriginalValue] nvarchar(256) NULL,
    [CorrectedValue] nvarchar(256) NULL,
    [ActorReference] nvarchar(256) NULL,
    [Reason] nvarchar(1024) NULL,
    [ApprovalState] nvarchar(16) NOT NULL,
    [ApprovedByActorReference] nvarchar(256) NULL,
    [ApprovedAtUtc] datetime2 NULL,
    [WorkerVisible] bit NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceAttendanceAdjustments] PRIMARY KEY ([AttendanceAdjustmentId]),
    CONSTRAINT [FK_WorkforceAttendanceAdjustments_WorkforceClockSessions_StoreId_ClockSessionId] FOREIGN KEY ([StoreId], [ClockSessionId]) REFERENCES [WorkforceClockSessions] ([StoreId], [ClockSessionId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceClockBreaks] (
    [ClockBreakId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [ClockSessionId] uniqueidentifier NOT NULL,
    [IsPaid] bit NOT NULL,
    [StartedUtc] datetime2 NOT NULL,
    [EndedUtc] datetime2 NULL,
    [StartClockEventId] uniqueidentifier NOT NULL,
    [EndClockEventId] uniqueidentifier NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceClockBreaks] PRIMARY KEY ([ClockBreakId]),
    CONSTRAINT [FK_WorkforceClockBreaks_WorkforceClockSessions_StoreId_ClockSessionId] FOREIGN KEY ([StoreId], [ClockSessionId]) REFERENCES [WorkforceClockSessions] ([StoreId], [ClockSessionId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforcePersonnelListEntries] (
    [PersonnelListEntryId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [ParticipantId] uniqueidentifier NOT NULL,
    [BusinessName] nvarchar(256) NULL,
    [OrganizationNumber] nvarchar(64) NULL,
    [ParticipantDisplayName] nvarchar(256) NULL,
    [Category] nvarchar(32) NOT NULL,
    [LocalBusinessDate] datetime2 NOT NULL,
    [OnSiteStartUtc] datetime2 NOT NULL,
    [OnSiteEndUtc] datetime2 NULL,
    [AccountingYearEndUtc] datetime2 NOT NULL,
    [RetainUntilUtc] datetime2 NOT NULL,
    [SupersedesEntryId] uniqueidentifier NULL,
    [CorrectionActorReference] nvarchar(256) NULL,
    [CorrectedAtUtc] datetime2 NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforcePersonnelListEntries] PRIMARY KEY ([PersonnelListEntryId]),
    CONSTRAINT [FK_WorkforcePersonnelListEntries_WorkforcePersonnelListParticipants_StoreId_ParticipantId] FOREIGN KEY ([StoreId], [ParticipantId]) REFERENCES [WorkforcePersonnelListParticipants] ([StoreId], [ParticipantId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforcePersonnelPresenceEvents] (
    [PresenceEventId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [ParticipantId] uniqueidentifier NOT NULL,
    [PresenceEventType] nvarchar(16) NOT NULL,
    [OccurredUtc] datetime2 NOT NULL,
    [LocalBusinessDate] datetime2 NOT NULL,
    [RecordedByActorReference] nvarchar(256) NULL,
    [SourceClockEventId] uniqueidentifier NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforcePersonnelPresenceEvents] PRIMARY KEY ([PresenceEventId]),
    CONSTRAINT [FK_WorkforcePersonnelPresenceEvents_WorkforcePersonnelListParticipants_StoreId_ParticipantId] FOREIGN KEY ([StoreId], [ParticipantId]) REFERENCES [WorkforcePersonnelListParticipants] ([StoreId], [ParticipantId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceShiftExchangeRequests] (
    [ShiftExchangeRequestId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [ExchangeId] uniqueidentifier NOT NULL,
    [Kind] nvarchar(32) NOT NULL,
    [Status] nvarchar(32) NOT NULL,
    [TargetShiftAssignmentId] uniqueidentifier NOT NULL,
    [CounterShiftAssignmentId] uniqueidentifier NULL,
    [InitiatingStaffMemberId] uniqueidentifier NULL,
    [CandidateStaffMemberId] uniqueidentifier NULL,
    [CandidateDecision] nvarchar(16) NOT NULL,
    [CandidateDecisionAtUtc] datetime2 NULL,
    [AwardedByActorReference] nvarchar(256) NULL,
    [DecidedAtUtc] datetime2 NULL,
    [ExpiresAtUtc] datetime2 NULL,
    [Note] nvarchar(1024) NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceShiftExchangeRequests] PRIMARY KEY ([ShiftExchangeRequestId]),
    CONSTRAINT [FK_WorkforceShiftExchangeRequests_WorkforceShiftAssignments_StoreId_CounterShiftAssignmentId] FOREIGN KEY ([StoreId], [CounterShiftAssignmentId]) REFERENCES [WorkforceShiftAssignments] ([StoreId], [ShiftAssignmentId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_WorkforceShiftExchangeRequests_WorkforceShiftAssignments_StoreId_TargetShiftAssignmentId] FOREIGN KEY ([StoreId], [TargetShiftAssignmentId]) REFERENCES [WorkforceShiftAssignments] ([StoreId], [ShiftAssignmentId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_WorkforceShiftExchangeRequests_WorkforceStaffMembers_StoreId_CandidateStaffMemberId] FOREIGN KEY ([StoreId], [CandidateStaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_WorkforceShiftExchangeRequests_WorkforceStaffMembers_StoreId_InitiatingStaffMemberId] FOREIGN KEY ([StoreId], [InitiatingStaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [EventsPaymentReceipts] (
    [Id] int NOT NULL IDENTITY,
    [DepositId] int NOT NULL,
    [Kind] nvarchar(32) NOT NULL,
    [ProviderReference] nvarchar(256) NULL,
    [AmountMinor] bigint NOT NULL,
    [PayloadHash] nvarchar(128) NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_EventsPaymentReceipts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EventsPaymentReceipts_EventsDeposits_DepositId] FOREIGN KEY ([DepositId]) REFERENCES [EventsDeposits] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [EventsRunSheetItems] (
    [Id] int NOT NULL IDENTITY,
    [RunSheetId] int NOT NULL,
    [Section] nvarchar(16) NOT NULL,
    [SortOrder] int NOT NULL,
    [TimeLabel] nvarchar(64) NULL,
    [Body] nvarchar(2048) NOT NULL,
    [QuantityLabel] nvarchar(64) NULL,
    CONSTRAINT [PK_EventsRunSheetItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EventsRunSheetItems_EventsRunSheets_RunSheetId] FOREIGN KEY ([RunSheetId]) REFERENCES [EventsRunSheets] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthProviderEventReceipts] (
    [Id] bigint NOT NULL IDENTITY,
    [ProviderAccountId] bigint NOT NULL,
    [ProviderEventId] nvarchar(256) NULL,
    [EventType] nvarchar(24) NOT NULL,
    [DispatchRunId] bigint NULL,
    [SignatureVerified] bit NOT NULL,
    [PayloadHash] nvarchar(128) NULL,
    [ReceivedAt] datetimeoffset NOT NULL,
    [AppliedAt] datetimeoffset NULL,
    CONSTRAINT [PK_GrowthProviderEventReceipts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthProviderEventReceipts_GrowthDispatchRuns_DispatchRunId] FOREIGN KEY ([DispatchRunId]) REFERENCES [GrowthDispatchRuns] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_GrowthProviderEventReceipts_GrowthProviderAccounts_ProviderAccountId] FOREIGN KEY ([ProviderAccountId]) REFERENCES [GrowthProviderAccounts] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthSendIntents] (
    [Id] bigint NOT NULL IDENTITY,
    [DispatchRunId] bigint NOT NULL,
    [ContactPointId] bigint NOT NULL,
    [LogicalSendKey] nvarchar(256) NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_GrowthSendIntents] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthSendIntents_GrowthContactPoints_ContactPointId] FOREIGN KEY ([ContactPointId]) REFERENCES [GrowthContactPoints] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_GrowthSendIntents_GrowthDispatchRuns_DispatchRunId] FOREIGN KEY ([DispatchRunId]) REFERENCES [GrowthDispatchRuns] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MealsFundingReservations] (
    [ReservationId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [ProgramId] uniqueidentifier NOT NULL,
    [PolicyVersionId] uniqueidentifier NOT NULL,
    [MembershipId] uniqueidentifier NOT NULL,
    [AgreementId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [ApplicationUserId] nvarchar(450) NULL,
    [PeriodKey] nvarchar(16) NOT NULL,
    [QuoteHash] nvarchar(128) NULL,
    [ReservedCapMinor] bigint NOT NULL,
    [Currency] nchar(3) NOT NULL,
    [State] nvarchar(32) NOT NULL,
    [AuthorizationTokenHash] nvarchar(128) NOT NULL,
    [ExpiresAtUtc] datetime2 NOT NULL,
    [ReleaseReasonCode] nvarchar(64) NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsFundingReservations] PRIMARY KEY ([ReservationId]),
    CONSTRAINT [AK_MealsFundingReservations_CompanyId_ReservationId] UNIQUE ([CompanyId], [ReservationId]),
    CONSTRAINT [CK_MealsFundingReservations_CapNonNegative] CHECK ([ReservedCapMinor] >= 0),
    CONSTRAINT [CK_MealsFundingReservations_Currency] CHECK (LEN([Currency]) = 3),
    CONSTRAINT [FK_MealsFundingReservations_MealsAgreements_CompanyId_AgreementId] FOREIGN KEY ([CompanyId], [AgreementId]) REFERENCES [MealsAgreements] ([CompanyId], [AgreementId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealsFundingReservations_MealsCompanies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [MealsCompanies] ([CompanyId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealsFundingReservations_MealsMemberships_CompanyId_MembershipId] FOREIGN KEY ([CompanyId], [MembershipId]) REFERENCES [MealsMemberships] ([CompanyId], [MembershipId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealsFundingReservations_MealsPolicyVersions_CompanyId_PolicyVersionId] FOREIGN KEY ([CompanyId], [PolicyVersionId]) REFERENCES [MealsPolicyVersions] ([CompanyId], [PolicyVersionId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealsFundingReservations_MealsPrograms_CompanyId_ProgramId] FOREIGN KEY ([CompanyId], [ProgramId]) REFERENCES [MealsPrograms] ([CompanyId], [ProgramId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [GrowthDeliveries] (
    [Id] bigint NOT NULL IDENTITY,
    [SendIntentId] bigint NOT NULL,
    [Status] nvarchar(24) NOT NULL,
    [LeaseToken] nvarchar(128) NULL,
    [LeaseExpiresAt] datetimeoffset NULL,
    [NextAttemptAt] datetimeoffset NOT NULL,
    [AttemptCount] int NOT NULL,
    [ProviderClientKey] nvarchar(256) NULL,
    [ProviderMessageId] nvarchar(256) NULL,
    [EligibilityGuardVersion] int NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_GrowthDeliveries] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_GrowthDeliveries_GrowthSendIntents_SendIntentId] FOREIGN KEY ([SendIntentId]) REFERENCES [GrowthSendIntents] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MealsOrderAttributions] (
    [AttributionId] uniqueidentifier NOT NULL,
    [CompanyId] uniqueidentifier NOT NULL,
    [ReservationId] uniqueidentifier NOT NULL,
    [OrderId] int NOT NULL,
    [StoreId] int NOT NULL,
    [BoundCartTotalMinor] bigint NOT NULL,
    [Currency] nchar(3) NOT NULL,
    [BoundAtUtc] datetime2 NOT NULL,
    [CapturedAtUtc] datetime2 NULL,
    [ConcurrencyVersion] rowversion NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_MealsOrderAttributions] PRIMARY KEY ([AttributionId]),
    CONSTRAINT [CK_MealsOrderAttributions_BoundTotalNonNegative] CHECK ([BoundCartTotalMinor] >= 0),
    CONSTRAINT [CK_MealsOrderAttributions_Currency] CHECK (LEN([Currency]) = 3),
    CONSTRAINT [FK_MealsOrderAttributions_MealsCompanies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [MealsCompanies] ([CompanyId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealsOrderAttributions_MealsFundingReservations_CompanyId_ReservationId] FOREIGN KEY ([CompanyId], [ReservationId]) REFERENCES [MealsFundingReservations] ([CompanyId], [ReservationId]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_EventsAcceptanceReceipts_EventId] ON [EventsAcceptanceReceipts] ([EventId]);
GO

CREATE INDEX [IX_EventsAcceptanceReceipts_ProposalVersionId] ON [EventsAcceptanceReceipts] ([ProposalVersionId]);
GO

CREATE INDEX [IX_EventsDeposits_DinteroSessionId] ON [EventsDeposits] ([DinteroSessionId]);
GO

CREATE INDEX [IX_EventsDeposits_PaymentIntentId] ON [EventsDeposits] ([PaymentIntentId]);
GO

CREATE INDEX [IX_EventsDeposits_ProposalVersionId] ON [EventsDeposits] ([ProposalVersionId]);
GO

CREATE UNIQUE INDEX [IX_EventsDeposits_PublicToken] ON [EventsDeposits] ([PublicToken]);
GO

CREATE INDEX [IX_EventsDeposits_VippsOrderId] ON [EventsDeposits] ([VippsOrderId]);
GO

CREATE UNIQUE INDEX [UX_EventsDeposits_OneActivePerEvent] ON [EventsDeposits] ([EventId]) WHERE [Status] <> 'Refunded' AND [Status] <> 'Forfeited' AND [Status] <> 'Expired' AND [Status] <> 'Failed' AND [Status] <> 'LatePaid' AND [Status] <> 'Quarantined';
GO

CREATE INDEX [IX_EventsEvents_CreatedByUserId] ON [EventsEvents] ([CreatedByUserId]);
GO

CREATE UNIQUE INDEX [IX_EventsEvents_PublicId] ON [EventsEvents] ([PublicId]);
GO

CREATE INDEX [IX_EventsEvents_SpaceId] ON [EventsEvents] ([SpaceId]);
GO

CREATE INDEX [IX_EventsEvents_StoreId_Status_EventDate] ON [EventsEvents] ([StoreId], [Status], [EventDate]);
GO

CREATE INDEX [IX_EventsNotes_AuthorUserId] ON [EventsNotes] ([AuthorUserId]);
GO

CREATE INDEX [IX_EventsNotes_EventId] ON [EventsNotes] ([EventId]);
GO

CREATE INDEX [IX_EventsPaymentReceipts_DepositId] ON [EventsPaymentReceipts] ([DepositId]);
GO

CREATE UNIQUE INDEX [IX_EventsProposalLines_ProposalVersionId_LineNo] ON [EventsProposalLines] ([ProposalVersionId], [LineNo]);
GO

CREATE UNIQUE INDEX [IX_EventsProposalVersions_EventId_VersionNo] ON [EventsProposalVersions] ([EventId], [VersionNo]);
GO

CREATE UNIQUE INDEX [IX_EventsProposalVersions_PublicToken] ON [EventsProposalVersions] ([PublicToken]);
GO

CREATE UNIQUE INDEX [UX_EventsProposalVersions_OneAcceptedPerEvent] ON [EventsProposalVersions] ([EventId]) WHERE [Status] = 'Accepted';
GO

CREATE UNIQUE INDEX [UX_EventsProposalVersions_OneSentPerEvent] ON [EventsProposalVersions] ([EventId]) WHERE [Status] = 'Sent';
GO

CREATE INDEX [IX_EventsRunSheetItems_RunSheetId] ON [EventsRunSheetItems] ([RunSheetId]);
GO

CREATE UNIQUE INDEX [IX_EventsRunSheets_EventId_VersionNo] ON [EventsRunSheets] ([EventId], [VersionNo]);
GO

CREATE INDEX [IX_EventsRunSheets_GeneratedFromProposalVersionId] ON [EventsRunSheets] ([GeneratedFromProposalVersionId]);
GO

CREATE UNIQUE INDEX [IX_EventsSettlementLines_SettlementId_LineNo] ON [EventsSettlementLines] ([SettlementId], [LineNo]);
GO

CREATE UNIQUE INDEX [UX_EventsSettlementLines_OneDepositAppliedPerSettlement] ON [EventsSettlementLines] ([SettlementId]) WHERE [Kind] = 'DepositApplied';
GO

CREATE UNIQUE INDEX [IX_EventsSettlements_EventId] ON [EventsSettlements] ([EventId]);
GO

CREATE INDEX [IX_EventsSpaces_StoreId] ON [EventsSpaces] ([StoreId]);
GO

CREATE INDEX [IX_EventsStateTransitions_EventId] ON [EventsStateTransitions] ([EventId]);
GO

CREATE INDEX [IX_GrowthConsentCheckReceipts_ContactPointId] ON [GrowthConsentCheckReceipts] ([ContactPointId]);
GO

CREATE INDEX [IX_GrowthConsentCheckReceipts_StoreId_EvaluatedAt] ON [GrowthConsentCheckReceipts] ([StoreId], [EvaluatedAt]);
GO

CREATE INDEX [IX_GrowthConsentReceipts_ConsentTextVersionId] ON [GrowthConsentReceipts] ([ConsentTextVersionId]);
GO

CREATE INDEX [IX_GrowthConsentReceipts_ContactPointId] ON [GrowthConsentReceipts] ([ContactPointId]);
GO

CREATE INDEX [IX_GrowthConsentReceipts_StoreId_ContactPointId] ON [GrowthConsentReceipts] ([StoreId], [ContactPointId]);
GO

CREATE UNIQUE INDEX [IX_GrowthConsentTextVersions_Locale_Version] ON [GrowthConsentTextVersions] ([Locale], [Version]) WHERE [Locale] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_GrowthContactPoints_Channel_LookupHmac_AddressVersion] ON [GrowthContactPoints] ([Channel], [LookupHmac], [AddressVersion]) WHERE [LookupHmac] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_GrowthDeliveries_ProviderClientKey] ON [GrowthDeliveries] ([ProviderClientKey]) WHERE [ProviderClientKey] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_GrowthDeliveries_ProviderMessageId] ON [GrowthDeliveries] ([ProviderMessageId]) WHERE [ProviderMessageId] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_GrowthDeliveries_SendIntentId] ON [GrowthDeliveries] ([SendIntentId]);
GO

CREATE UNIQUE INDEX [IX_GrowthDispatchRuns_NewsletterVersionId] ON [GrowthDispatchRuns] ([NewsletterVersionId]);
GO

CREATE INDEX [IX_GrowthNewsletterApprovals_NewsletterVersionId] ON [GrowthNewsletterApprovals] ([NewsletterVersionId]);
GO

CREATE INDEX [IX_GrowthNewsletterApprovals_SegmentSnapshotId] ON [GrowthNewsletterApprovals] ([SegmentSnapshotId]);
GO

CREATE INDEX [IX_GrowthNewsletters_StoreId] ON [GrowthNewsletters] ([StoreId]);
GO

CREATE UNIQUE INDEX [IX_GrowthNewsletterVersions_NewsletterId_VersionNo] ON [GrowthNewsletterVersions] ([NewsletterId], [VersionNo]);
GO

CREATE INDEX [IX_GrowthNewsletterVersions_SegmentSnapshotId] ON [GrowthNewsletterVersions] ([SegmentSnapshotId]);
GO

CREATE INDEX [IX_GrowthPreferenceTokens_ContactPointId] ON [GrowthPreferenceTokens] ([ContactPointId]);
GO

CREATE UNIQUE INDEX [IX_GrowthPreferenceTokens_TokenHash] ON [GrowthPreferenceTokens] ([TokenHash]) WHERE [TokenHash] IS NOT NULL;
GO

CREATE INDEX [IX_GrowthPrivacyRequests_ContactPointId] ON [GrowthPrivacyRequests] ([ContactPointId]);
GO

CREATE INDEX [IX_GrowthPrivacyRequests_StoreId_State] ON [GrowthPrivacyRequests] ([StoreId], [State]);
GO

CREATE INDEX [IX_GrowthProviderAccounts_ProviderKey_StoreId] ON [GrowthProviderAccounts] ([ProviderKey], [StoreId]);
GO

CREATE INDEX [IX_GrowthProviderEventReceipts_DispatchRunId] ON [GrowthProviderEventReceipts] ([DispatchRunId]);
GO

CREATE UNIQUE INDEX [IX_GrowthProviderEventReceipts_ProviderAccountId_ProviderEventId] ON [GrowthProviderEventReceipts] ([ProviderAccountId], [ProviderEventId]) WHERE [ProviderEventId] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_GrowthSegments_StoreId_SegmentKey_DefinitionVersion] ON [GrowthSegments] ([StoreId], [SegmentKey], [DefinitionVersion]) WHERE [SegmentKey] IS NOT NULL;
GO

CREATE INDEX [IX_GrowthSegmentSnapshotMembers_ContactPointId] ON [GrowthSegmentSnapshotMembers] ([ContactPointId]);
GO

CREATE UNIQUE INDEX [IX_GrowthSegmentSnapshotMembers_SnapshotId_ContactPointId] ON [GrowthSegmentSnapshotMembers] ([SnapshotId], [ContactPointId]);
GO

CREATE UNIQUE INDEX [IX_GrowthSegmentSnapshots_SegmentId_WatermarkHash] ON [GrowthSegmentSnapshots] ([SegmentId], [WatermarkHash]) WHERE [WatermarkHash] IS NOT NULL;
GO

CREATE INDEX [IX_GrowthSendIntents_ContactPointId] ON [GrowthSendIntents] ([ContactPointId]);
GO

CREATE INDEX [IX_GrowthSendIntents_DispatchRunId] ON [GrowthSendIntents] ([DispatchRunId]);
GO

CREATE UNIQUE INDEX [IX_GrowthSendIntents_LogicalSendKey] ON [GrowthSendIntents] ([LogicalSendKey]) WHERE [LogicalSendKey] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_GrowthSubscriptionInvites_ConfirmTokenHash] ON [GrowthSubscriptionInvites] ([ConfirmTokenHash]) WHERE [ConfirmTokenHash] IS NOT NULL;
GO

CREATE INDEX [IX_GrowthSubscriptionInvites_ContactPointId] ON [GrowthSubscriptionInvites] ([ContactPointId]);
GO

CREATE UNIQUE INDEX [IX_GrowthSubscriptionInvites_StoreId_ContactPointId] ON [GrowthSubscriptionInvites] ([StoreId], [ContactPointId]) WHERE [ConfirmedAt] IS NULL;
GO

CREATE INDEX [IX_GrowthSuppressions_ContactPointId] ON [GrowthSuppressions] ([ContactPointId]);
GO

CREATE UNIQUE INDEX [IX_MarginIngredients_StoreId_Name] ON [MarginIngredients] ([StoreId], [Name]) WHERE [Name] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_MarginIngredientUnitConversions_StoreId_IngredientId_FromUnitCode] ON [MarginIngredientUnitConversions] ([StoreId], [IngredientId], [FromUnitCode]) WHERE [IsActive] = 1;
GO

CREATE UNIQUE INDEX [IX_MarginPeriodStatements_StoreId_PeriodStart_RevisionNumber] ON [MarginPeriodStatements] ([StoreId], [PeriodStart], [RevisionNumber]);
GO

CREATE INDEX [IX_MarginPeriodStatements_StoreId_PreviousStatementId] ON [MarginPeriodStatements] ([StoreId], [PreviousStatementId]);
GO

CREATE UNIQUE INDEX [IX_MarginPriceImportBatches_StoreId_FileSha256] ON [MarginPriceImportBatches] ([StoreId], [FileSha256]) WHERE [FileSha256] IS NOT NULL;
GO

CREATE INDEX [IX_MarginPriceImportBatches_StoreId_SupplierId] ON [MarginPriceImportBatches] ([StoreId], [SupplierId]);
GO

CREATE INDEX [IX_MarginPriceImportRows_StoreId_BatchId] ON [MarginPriceImportRows] ([StoreId], [BatchId]);
GO

CREATE INDEX [IX_MarginPriceImportRows_StoreId_ResolvedSupplierItemId] ON [MarginPriceImportRows] ([StoreId], [ResolvedSupplierItemId]);
GO

CREATE INDEX [IX_MarginPurchaseSpendEntries_StoreId_StatementId] ON [MarginPurchaseSpendEntries] ([StoreId], [StatementId]);
GO

CREATE INDEX [IX_MarginPurchaseSpendEntries_StoreId_SupplierId] ON [MarginPurchaseSpendEntries] ([StoreId], [SupplierId]);
GO

CREATE INDEX [IX_MarginRecipeComponents_StoreId_IngredientId] ON [MarginRecipeComponents] ([StoreId], [IngredientId]);
GO

CREATE INDEX [IX_MarginRecipeComponents_StoreId_RecipeVersionId] ON [MarginRecipeComponents] ([StoreId], [RecipeVersionId]);
GO

CREATE INDEX [IX_MarginRecipeComponents_StoreId_SubRecipeId] ON [MarginRecipeComponents] ([StoreId], [SubRecipeId]);
GO

CREATE UNIQUE INDEX [IX_MarginRecipeProductLinks_StoreId_ProductId] ON [MarginRecipeProductLinks] ([StoreId], [ProductId]) WHERE [IsActive] = 1;
GO

CREATE INDEX [IX_MarginRecipeProductLinks_StoreId_RecipeId] ON [MarginRecipeProductLinks] ([StoreId], [RecipeId]);
GO

CREATE UNIQUE INDEX [IX_MarginRecipes_StoreId_Name] ON [MarginRecipes] ([StoreId], [Name]) WHERE [Name] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_MarginRecipeVersions_StoreId_RecipeId] ON [MarginRecipeVersions] ([StoreId], [RecipeId]) WHERE [State] = 'Active';
GO

CREATE UNIQUE INDEX [IX_MarginSalesFacts_JournalLineId] ON [MarginSalesFacts] ([JournalLineId]);
GO

CREATE INDEX [IX_MarginSalesFacts_StoreId_BusinessDate] ON [MarginSalesFacts] ([StoreId], [BusinessDate]);
GO

CREATE INDEX [IX_MarginSupplierItemPrices_StoreId_ImportBatchId] ON [MarginSupplierItemPrices] ([StoreId], [ImportBatchId]);
GO

CREATE INDEX [IX_MarginSupplierItemPrices_StoreId_SupplierItemId] ON [MarginSupplierItemPrices] ([StoreId], [SupplierItemId]);
GO

CREATE UNIQUE INDEX [IX_MarginSupplierItemPrices_SupplierItemId] ON [MarginSupplierItemPrices] ([SupplierItemId]) WHERE [EffectiveTo] IS NULL;
GO

CREATE UNIQUE INDEX [IX_MarginSupplierItemPrices_SupplierItemId_EffectiveFrom] ON [MarginSupplierItemPrices] ([SupplierItemId], [EffectiveFrom]);
GO

CREATE UNIQUE INDEX [IX_MarginSupplierItems_IngredientId] ON [MarginSupplierItems] ([IngredientId]) WHERE [IsPreferred] = 1;
GO

CREATE INDEX [IX_MarginSupplierItems_StoreId_IngredientId] ON [MarginSupplierItems] ([StoreId], [IngredientId]);
GO

CREATE INDEX [IX_MarginSupplierItems_StoreId_SupplierId] ON [MarginSupplierItems] ([StoreId], [SupplierId]);
GO

CREATE UNIQUE INDEX [IX_MarginSuppliers_StoreId_Name] ON [MarginSuppliers] ([StoreId], [Name]) WHERE [Name] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_MealsAgreements_CompanyId_StoreId_Currency] ON [MealsAgreements] ([CompanyId], [StoreId], [Currency]) WHERE [Status] = 'Active';
GO

CREATE INDEX [IX_MealsAgreements_StoreId] ON [MealsAgreements] ([StoreId]);
GO

CREATE INDEX [IX_MealsAuditEvents_CompanyId_AggregateType_AggregateId] ON [MealsAuditEvents] ([CompanyId], [AggregateType], [AggregateId]);
GO

CREATE INDEX [IX_MealsBudgetGuards_CompanyId_MembershipId] ON [MealsBudgetGuards] ([CompanyId], [MembershipId]);
GO

CREATE INDEX [IX_MealsBudgetGuards_CompanyId_ProgramId] ON [MealsBudgetGuards] ([CompanyId], [ProgramId]);
GO

CREATE UNIQUE INDEX [IX_MealsBudgetGuards_ProgramId_MembershipId_PeriodKey] ON [MealsBudgetGuards] ([ProgramId], [MembershipId], [PeriodKey]);
GO

CREATE UNIQUE INDEX [IX_MealsCommandReceipts_CompanyId_ScopeKey_IdempotencyKey] ON [MealsCommandReceipts] ([CompanyId], [ScopeKey], [IdempotencyKey]);
GO

CREATE INDEX [IX_MealsCreditAdjustments_CompanyId_StatementRunId] ON [MealsCreditAdjustments] ([CompanyId], [StatementRunId]);
GO

CREATE UNIQUE INDEX [IX_MealsCreditAdjustments_SourceReversalAllocationId] ON [MealsCreditAdjustments] ([SourceReversalAllocationId]);
GO

CREATE INDEX [IX_MealsFundingAllocations_CompanyId_AttributionId] ON [MealsFundingAllocations] ([CompanyId], [AttributionId]);
GO

CREATE INDEX [IX_MealsFundingAllocations_CompanyId_ProgramId_MembershipId_PeriodKey] ON [MealsFundingAllocations] ([CompanyId], [ProgramId], [MembershipId], [PeriodKey]);
GO

CREATE UNIQUE INDEX [IX_MealsFundingAllocations_SourceJournalEntryId] ON [MealsFundingAllocations] ([SourceJournalEntryId]);
GO

CREATE UNIQUE INDEX [IX_MealsFundingReservations_AuthorizationTokenHash] ON [MealsFundingReservations] ([AuthorizationTokenHash]);
GO

CREATE INDEX [IX_MealsFundingReservations_CompanyId_AgreementId] ON [MealsFundingReservations] ([CompanyId], [AgreementId]);
GO

CREATE INDEX [IX_MealsFundingReservations_CompanyId_MembershipId] ON [MealsFundingReservations] ([CompanyId], [MembershipId]);
GO

CREATE INDEX [IX_MealsFundingReservations_CompanyId_PolicyVersionId] ON [MealsFundingReservations] ([CompanyId], [PolicyVersionId]);
GO

CREATE INDEX [IX_MealsFundingReservations_CompanyId_ProgramId] ON [MealsFundingReservations] ([CompanyId], [ProgramId]);
GO

CREATE INDEX [IX_MealsFundingReservations_State_ExpiresAtUtc] ON [MealsFundingReservations] ([State], [ExpiresAtUtc]);
GO

CREATE INDEX [IX_MealsFundingReservations_StoreId] ON [MealsFundingReservations] ([StoreId]);
GO

CREATE UNIQUE INDEX [IX_MealsInvitations_TokenHash] ON [MealsInvitations] ([TokenHash]);
GO

CREATE UNIQUE INDEX [IX_MealsMemberships_CompanyId_ApplicationUserId] ON [MealsMemberships] ([CompanyId], [ApplicationUserId]) WHERE [State] = 'Active';
GO

CREATE INDEX [IX_MealsMemberships_CompanyId_ClaimedFromInvitationId] ON [MealsMemberships] ([CompanyId], [ClaimedFromInvitationId]);
GO

CREATE UNIQUE INDEX [IX_MealsOrderAttributions_CompanyId_ReservationId] ON [MealsOrderAttributions] ([CompanyId], [ReservationId]);
GO

CREATE UNIQUE INDEX [IX_MealsOrderAttributions_OrderId] ON [MealsOrderAttributions] ([OrderId]);
GO

CREATE INDEX [IX_MealsOrderAttributions_StoreId_BoundAtUtc] ON [MealsOrderAttributions] ([StoreId], [BoundAtUtc]) WHERE [CapturedAtUtc] IS NULL;
GO

CREATE INDEX [IX_MealsPolicyVersions_CompanyId_ProgramId_EffectiveFromUtc] ON [MealsPolicyVersions] ([CompanyId], [ProgramId], [EffectiveFromUtc]);
GO

CREATE UNIQUE INDEX [IX_MealsPolicyVersions_CompanyId_ProgramId_Version] ON [MealsPolicyVersions] ([CompanyId], [ProgramId], [Version]);
GO

CREATE INDEX [IX_MealsProgramMembers_CompanyId_MembershipId] ON [MealsProgramMembers] ([CompanyId], [MembershipId]);
GO

CREATE INDEX [IX_MealsProgramMembers_CompanyId_ProgramId] ON [MealsProgramMembers] ([CompanyId], [ProgramId]);
GO

CREATE UNIQUE INDEX [IX_MealsProgramMembers_ProgramId_MembershipId] ON [MealsProgramMembers] ([ProgramId], [MembershipId]) WHERE [State] = 'Enrolled';
GO

CREATE INDEX [IX_MealsPrograms_CompanyId_AgreementId] ON [MealsPrograms] ([CompanyId], [AgreementId]);
GO

CREATE INDEX [IX_MealsPrograms_CompanyId_Status] ON [MealsPrograms] ([CompanyId], [Status]);
GO

CREATE UNIQUE INDEX [IX_MealsProjectionCheckpoints_ProjectionName_StoreId] ON [MealsProjectionCheckpoints] ([ProjectionName], [StoreId]);
GO

CREATE INDEX [IX_MealsReconciliationExceptions_CompanyId_State] ON [MealsReconciliationExceptions] ([CompanyId], [State]);
GO

CREATE UNIQUE INDEX [IX_MealsReconciliationExceptions_Kind_SourceKey] ON [MealsReconciliationExceptions] ([Kind], [SourceKey]) WHERE [State] = 'Open';
GO

CREATE INDEX [IX_MealsReconciliationExceptions_StoreId_State] ON [MealsReconciliationExceptions] ([StoreId], [State]);
GO

CREATE UNIQUE INDEX [IX_MealsStatementLines_AllocationId] ON [MealsStatementLines] ([AllocationId]);
GO

CREATE INDEX [IX_MealsStatementLines_CompanyId_StatementRunId] ON [MealsStatementLines] ([CompanyId], [StatementRunId]);
GO

CREATE UNIQUE INDEX [IX_MealsStatementRuns_CompanyId_StoreId_Currency_PeriodYear_PeriodMonth] ON [MealsStatementRuns] ([CompanyId], [StoreId], [Currency], [PeriodYear], [PeriodMonth]) WHERE [Status] = 'Finalized';
GO

CREATE INDEX [IX_MealsStatementRuns_CompanyId_StoreId_PeriodYear_PeriodMonth] ON [MealsStatementRuns] ([CompanyId], [StoreId], [PeriodYear], [PeriodMonth]);
GO

CREATE UNIQUE INDEX [IX_StoreFeatureFlags_StoreId_FlagKey] ON [StoreFeatureFlags] ([StoreId], [FlagKey]);
GO

CREATE INDEX [IX_TrainingAssignments_StoreId_CourseVersionId] ON [TrainingAssignments] ([StoreId], [CourseVersionId]);
GO

CREATE INDEX [IX_TrainingAssignments_StoreId_PersonRef] ON [TrainingAssignments] ([StoreId], [PersonRef]);
GO

CREATE INDEX [IX_TrainingAssignments_StoreId_RoleRef] ON [TrainingAssignments] ([StoreId], [RoleRef]);
GO

CREATE INDEX [IX_TrainingAuditEvents_StoreId_AggregateType_AggregateId] ON [TrainingAuditEvents] ([StoreId], [AggregateType], [AggregateId]);
GO

CREATE INDEX [IX_TrainingCertificates_StoreId_ExpiryDate] ON [TrainingCertificates] ([StoreId], [ExpiryDate]);
GO

CREATE INDEX [IX_TrainingCertificates_StoreId_PersonRef_Type] ON [TrainingCertificates] ([StoreId], [PersonRef], [Type]);
GO

CREATE INDEX [IX_TrainingCompletions_StoreId_CourseVersionId] ON [TrainingCompletions] ([StoreId], [CourseVersionId]);
GO

CREATE INDEX [IX_TrainingCompletions_StoreId_PersonRef_CourseVersionId] ON [TrainingCompletions] ([StoreId], [PersonRef], [CourseVersionId]);
GO

CREATE INDEX [IX_TrainingCourses_StoreId_IsActive] ON [TrainingCourses] ([StoreId], [IsActive]);
GO

CREATE UNIQUE INDEX [IX_TrainingCourseVersions_StoreId_CourseId_VersionNo] ON [TrainingCourseVersions] ([StoreId], [CourseId], [VersionNo]);
GO

CREATE UNIQUE INDEX [IX_TrainingIdempotencyRecords_StoreId_Scope_IdempotencyKey] ON [TrainingIdempotencyRecords] ([StoreId], [Scope], [IdempotencyKey]);
GO

CREATE INDEX [IX_WorkforceAttendanceAdjustments_StoreId_ClockSessionId] ON [WorkforceAttendanceAdjustments] ([StoreId], [ClockSessionId]);
GO

CREATE INDEX [IX_WorkforceAuditEvents_StoreId_AggregateType_AggregateId] ON [WorkforceAuditEvents] ([StoreId], [AggregateType], [AggregateId]);
GO

CREATE INDEX [IX_WorkforceAvailabilityExceptions_StoreId_StaffMemberId] ON [WorkforceAvailabilityExceptions] ([StoreId], [StaffMemberId]);
GO

CREATE INDEX [IX_WorkforceAvailabilityRules_StoreId_StaffMemberId] ON [WorkforceAvailabilityRules] ([StoreId], [StaffMemberId]);
GO

CREATE INDEX [IX_WorkforceClockBreaks_StoreId_ClockSessionId] ON [WorkforceClockBreaks] ([StoreId], [ClockSessionId]);
GO

CREATE UNIQUE INDEX [IX_WorkforceClockEvents_Source_ClientEventId] ON [WorkforceClockEvents] ([Source], [ClientEventId]);
GO

CREATE INDEX [IX_WorkforceClockEvents_StoreId_StaffMemberId] ON [WorkforceClockEvents] ([StoreId], [StaffMemberId]);
GO

CREATE INDEX [IX_WorkforceClockSessions_StoreId_StaffMemberId] ON [WorkforceClockSessions] ([StoreId], [StaffMemberId]);
GO

CREATE UNIQUE INDEX [IX_WorkforceClockSessions_StoreId_WorkforcePersonId_LegalEmployerId] ON [WorkforceClockSessions] ([StoreId], [WorkforcePersonId], [LegalEmployerId]) WHERE [ClosedUtc] IS NULL;
GO

CREATE INDEX [IX_WorkforceEmploymentTerms_StoreId_StaffMemberId] ON [WorkforceEmploymentTerms] ([StoreId], [StaffMemberId]);
GO

CREATE UNIQUE INDEX [IX_WorkforceIdempotencyRecords_Scope_Key] ON [WorkforceIdempotencyRecords] ([Scope], [Key]) WHERE [Scope] IS NOT NULL AND [Key] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_WorkforceInboxItems_LogicalEventKey] ON [WorkforceInboxItems] ([LogicalEventKey]) WHERE [LogicalEventKey] IS NOT NULL;
GO

CREATE INDEX [IX_WorkforceInboxItems_StoreId_StaffMemberId] ON [WorkforceInboxItems] ([StoreId], [StaffMemberId]);
GO

CREATE UNIQUE INDEX [IX_WorkforceInvitations_StoreId_StaffMemberId] ON [WorkforceInvitations] ([StoreId], [StaffMemberId]) WHERE [State] = 'Pending';
GO

CREATE UNIQUE INDEX [IX_WorkforceInvitations_TokenHash] ON [WorkforceInvitations] ([TokenHash]) WHERE [TokenHash] IS NOT NULL;
GO

CREATE INDEX [IX_WorkforceNotificationOutbox_LeaseExpiresUtc] ON [WorkforceNotificationOutbox] ([LeaseExpiresUtc]);
GO

CREATE UNIQUE INDEX [IX_WorkforceNotificationOutbox_LogicalDedupeKey] ON [WorkforceNotificationOutbox] ([LogicalDedupeKey]) WHERE [LogicalDedupeKey] IS NOT NULL;
GO

CREATE INDEX [IX_WorkforceNotificationOutbox_Status_NextAttemptUtc] ON [WorkforceNotificationOutbox] ([Status], [NextAttemptUtc]);
GO

CREATE INDEX [IX_WorkforcePersonnelListEntries_StoreId_LocalBusinessDate] ON [WorkforcePersonnelListEntries] ([StoreId], [LocalBusinessDate]);
GO

CREATE INDEX [IX_WorkforcePersonnelListEntries_StoreId_ParticipantId] ON [WorkforcePersonnelListEntries] ([StoreId], [ParticipantId]);
GO

CREATE INDEX [IX_WorkforcePersonnelListParticipants_StoreId_Category] ON [WorkforcePersonnelListParticipants] ([StoreId], [Category]);
GO

CREATE INDEX [IX_WorkforcePersonnelListParticipants_StoreId_StaffMemberId] ON [WorkforcePersonnelListParticipants] ([StoreId], [StaffMemberId]);
GO

CREATE INDEX [IX_WorkforcePersonnelPresenceEvents_StoreId_LocalBusinessDate] ON [WorkforcePersonnelPresenceEvents] ([StoreId], [LocalBusinessDate]);
GO

CREATE INDEX [IX_WorkforcePersonnelPresenceEvents_StoreId_ParticipantId] ON [WorkforcePersonnelPresenceEvents] ([StoreId], [ParticipantId]);
GO

CREATE UNIQUE INDEX [IX_WorkforcePersons_ApplicationUserId] ON [WorkforcePersons] ([ApplicationUserId]) WHERE [ApplicationUserId] IS NOT NULL;
GO

CREATE INDEX [IX_WorkforcePolicyEvidence_RuleSetVersionId] ON [WorkforcePolicyEvidence] ([RuleSetVersionId]);
GO

CREATE INDEX [IX_WorkforcePolicyEvidence_StoreId] ON [WorkforcePolicyEvidence] ([StoreId]);
GO

CREATE INDEX [IX_WorkforceRoles_StoreId] ON [WorkforceRoles] ([StoreId]);
GO

CREATE INDEX [IX_WorkforceRuleSetVersions_Jurisdiction_PackName_Version] ON [WorkforceRuleSetVersions] ([Jurisdiction], [PackName], [Version]);
GO

CREATE INDEX [IX_WorkforceSchedulePublicationReceipts_StoreId_SchedulePublicationId] ON [WorkforceSchedulePublicationReceipts] ([StoreId], [SchedulePublicationId]);
GO

CREATE INDEX [IX_WorkforceSchedulePublicationReceipts_StoreId_StaffMemberId] ON [WorkforceSchedulePublicationReceipts] ([StoreId], [StaffMemberId]);
GO

CREATE UNIQUE INDEX [IX_WorkforceSchedulePublicationRecipients_SchedulePublicationId_StaffMemberId] ON [WorkforceSchedulePublicationRecipients] ([SchedulePublicationId], [StaffMemberId]);
GO

CREATE INDEX [IX_WorkforceSchedulePublicationRecipients_StoreId_SchedulePublicationId] ON [WorkforceSchedulePublicationRecipients] ([StoreId], [SchedulePublicationId]);
GO

CREATE INDEX [IX_WorkforceSchedulePublicationRecipients_StoreId_StaffMemberId] ON [WorkforceSchedulePublicationRecipients] ([StoreId], [StaffMemberId]);
GO

CREATE UNIQUE INDEX [IX_WorkforceSchedulePublications_StoreId_ScheduleRevisionId_PublicationNumber] ON [WorkforceSchedulePublications] ([StoreId], [ScheduleRevisionId], [PublicationNumber]);
GO

CREATE UNIQUE INDEX [IX_WorkforceScheduleRevisions_StoreId_RangeStartUtc_RangeEndUtc_RevisionNumber] ON [WorkforceScheduleRevisions] ([StoreId], [RangeStartUtc], [RangeEndUtc], [RevisionNumber]);
GO

CREATE INDEX [IX_WorkforceScheduleValidationReceipts_StoreId_ScheduleRevisionId] ON [WorkforceScheduleValidationReceipts] ([StoreId], [ScheduleRevisionId]);
GO

CREATE INDEX [IX_WorkforceShiftAssignments_StoreId_RoleId] ON [WorkforceShiftAssignments] ([StoreId], [RoleId]);
GO

CREATE INDEX [IX_WorkforceShiftAssignments_StoreId_ScheduleRevisionId] ON [WorkforceShiftAssignments] ([StoreId], [ScheduleRevisionId]);
GO

CREATE INDEX [IX_WorkforceShiftAssignments_StoreId_StaffMemberId] ON [WorkforceShiftAssignments] ([StoreId], [StaffMemberId]);
GO

CREATE INDEX [IX_WorkforceShiftExchangeRequests_StoreId_CandidateStaffMemberId] ON [WorkforceShiftExchangeRequests] ([StoreId], [CandidateStaffMemberId]);
GO

CREATE INDEX [IX_WorkforceShiftExchangeRequests_StoreId_CounterShiftAssignmentId] ON [WorkforceShiftExchangeRequests] ([StoreId], [CounterShiftAssignmentId]);
GO

CREATE UNIQUE INDEX [IX_WorkforceShiftExchangeRequests_StoreId_ExchangeId_Awarded] ON [WorkforceShiftExchangeRequests] ([StoreId], [ExchangeId]) WHERE [Status] = 'Awarded';
GO

CREATE INDEX [IX_WorkforceShiftExchangeRequests_StoreId_InitiatingStaffMemberId] ON [WorkforceShiftExchangeRequests] ([StoreId], [InitiatingStaffMemberId]);
GO

CREATE UNIQUE INDEX [IX_WorkforceShiftExchangeRequests_StoreId_TargetShiftAssignmentId_Awarded] ON [WorkforceShiftExchangeRequests] ([StoreId], [TargetShiftAssignmentId]) WHERE [Status] = 'Awarded';
GO

CREATE INDEX [IX_WorkforceStaffMembers_LegalEmployerId] ON [WorkforceStaffMembers] ([LegalEmployerId]);
GO

CREATE INDEX [IX_WorkforceStaffMembers_StoreId] ON [WorkforceStaffMembers] ([StoreId]);
GO

CREATE INDEX [IX_WorkforceStaffMembers_WorkforcePersonId] ON [WorkforceStaffMembers] ([WorkforcePersonId]);
GO

CREATE INDEX [IX_WorkforceStaffRoles_StoreId_RoleId] ON [WorkforceStaffRoles] ([StoreId], [RoleId]);
GO

CREATE UNIQUE INDEX [IX_WorkforceStaffRoles_StoreId_StaffMemberId_RoleId] ON [WorkforceStaffRoles] ([StoreId], [StaffMemberId], [RoleId]);
GO

CREATE INDEX [IX_WorkforceTimeOffRequests_StoreId_FirstAffectedScheduleRevisionId] ON [WorkforceTimeOffRequests] ([StoreId], [FirstAffectedScheduleRevisionId]);
GO

CREATE INDEX [IX_WorkforceTimeOffRequests_StoreId_StaffMemberId] ON [WorkforceTimeOffRequests] ([StoreId], [StaffMemberId]);
GO

CREATE INDEX [IX_WorkforceTimeOffRequests_StoreId_Status] ON [WorkforceTimeOffRequests] ([StoreId], [Status]);
GO

CREATE UNIQUE INDEX [UX_WorkforceStaffMembers_ActiveEngagement] ON [WorkforceStaffMembers] ([WorkforcePersonId], [LegalEmployerId]) WHERE [IsActive] = 1;
GO

CREATE TRIGGER [dbo].[TR_WorkforceAuditEvents_AppendOnly]
ON [dbo].[WorkforceAuditEvents]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 50010, 'WorkforceAuditEvents is append-only: UPDATE and DELETE are not permitted.', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_WorkforceIdempotencyRecords_AppendOnly]
ON [dbo].[WorkforceIdempotencyRecords]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 50011, 'WorkforceIdempotencyRecords is append-only: UPDATE and DELETE are not permitted.', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_WorkforceSchedulePublications_Immutable]
ON [dbo].[WorkforceSchedulePublications]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 50012, 'WorkforceSchedulePublications is immutable: UPDATE and DELETE are not permitted (a post-publication change creates a successor publication).', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_WorkforceClockEvents_AppendOnly]
ON [dbo].[WorkforceClockEvents]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 50013, 'WorkforceClockEvents is append-only: raw clock truth is never updated or deleted (a correction is a WorkforceAttendanceAdjustment).', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_WorkforceAttendanceAdjustments_AppendOnly]
ON [dbo].[WorkforceAttendanceAdjustments]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 50014, 'WorkforceAttendanceAdjustments is append-only: UPDATE and DELETE are not permitted (a reversal is a new adjustment row).', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_WorkforcePersonnelListParticipants_RetentionLock]
ON [dbo].[WorkforcePersonnelListParticipants]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 50015, 'WorkforcePersonnelListParticipants is retention-locked (statutory personalliste, 3y6m): UPDATE and DELETE are not permitted.', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_WorkforcePersonnelPresenceEvents_RetentionLock]
ON [dbo].[WorkforcePersonnelPresenceEvents]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 50016, 'WorkforcePersonnelPresenceEvents is retention-locked (statutory personalliste, 3y6m): UPDATE and DELETE are not permitted.', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_WorkforcePersonnelListEntries_RetentionLock]
ON [dbo].[WorkforcePersonnelListEntries]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 50017, 'WorkforcePersonnelListEntries is retention-locked (statutory personalliste, 3y6m): UPDATE and DELETE are not permitted (a correction is a new superseding entry).', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_GrowthConsentReceipts_AppendOnly]
ON [dbo].[GrowthConsentReceipts]
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50030, 'GrowthConsentReceipts is append-only: UPDATE and DELETE are not permitted.', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_GrowthSuppressions_AppendOnly]
ON [dbo].[GrowthSuppressions]
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50031, 'GrowthSuppressions is append-only: UPDATE and DELETE are not permitted.', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_GrowthConsentCheckReceipts_AppendOnly]
ON [dbo].[GrowthConsentCheckReceipts]
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50032, 'GrowthConsentCheckReceipts is append-only: UPDATE and DELETE are not permitted.', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_GrowthProviderEventReceipts_AppendOnly]
ON [dbo].[GrowthProviderEventReceipts]
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50033, 'GrowthProviderEventReceipts is append-only: UPDATE and DELETE are not permitted.', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_EventsAcceptanceReceipts_AppendOnly]
ON [dbo].[EventsAcceptanceReceipts]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 50020, 'EventsAcceptanceReceipts is append-only: UPDATE and DELETE are not permitted.', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_EventsStateTransitions_AppendOnly]
ON [dbo].[EventsStateTransitions]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 50021, 'EventsStateTransitions is append-only: UPDATE and DELETE are not permitted.', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_EventsPaymentReceipts_AppendOnly]
ON [dbo].[EventsPaymentReceipts]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 50022, 'EventsPaymentReceipts is append-only: UPDATE and DELETE are not permitted.', 1;
END;
GO

CREATE TRIGGER [dbo].[TR_MarginSalesFacts_AppendOnly]
ON [dbo].[MarginSalesFacts]
AFTER UPDATE, DELETE
AS
BEGIN
    ROLLBACK TRANSACTION;
    THROW 50060, 'MarginSalesFacts is append-only: UPDATE and DELETE are not permitted. A return is a new negative fact; repair is rebuild-from-watermark-zero.', 1;
END
GO

CREATE TRIGGER [dbo].[TR_MealsAuditEvents_AppendOnly]
ON [dbo].[MealsAuditEvents]
AFTER UPDATE, DELETE
AS
BEGIN
    ROLLBACK TRANSACTION;
    THROW 50040, 'MealsAuditEvents is append-only: UPDATE and DELETE are not permitted.', 1;
END
GO

CREATE TRIGGER [dbo].[TR_MealsFundingAllocations_AppendOnly]
ON [dbo].[MealsFundingAllocations]
AFTER UPDATE, DELETE
AS
BEGIN
    ROLLBACK TRANSACTION;
    THROW 50041, 'MealsFundingAllocations is append-only: UPDATE and DELETE are not permitted.', 1;
END
GO

CREATE TRIGGER [dbo].[TR_MealsCreditAdjustments_AppendOnly]
ON [dbo].[MealsCreditAdjustments]
AFTER UPDATE, DELETE
AS
BEGIN
    ROLLBACK TRANSACTION;
    THROW 50042, 'MealsCreditAdjustments is append-only: UPDATE and DELETE are not permitted.', 1;
END
GO

CREATE TRIGGER [dbo].[TR_MealsStatementLines_FinalizedImmutable]
ON [dbo].[MealsStatementLines]
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    IF EXISTS (
        SELECT 1 FROM [dbo].[MealsStatementRuns] r
        WHERE r.[Status] = 'Finalized'
          AND r.[StatementRunId] IN (
              SELECT [StatementRunId] FROM inserted
              UNION
              SELECT [StatementRunId] FROM deleted))
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50043, 'MealsStatementLines owned by a Finalized MealsStatementRun are immutable: its lines, totals and content hash are frozen. Record a post-finalization reversal as a MealsCreditAdjustment.', 1;
    END
END
GO

CREATE TRIGGER [dbo].[TR_TrainingCompletions_AppendOnly]
ON [dbo].[TrainingCompletions]
AFTER UPDATE, DELETE
AS
BEGIN
    ROLLBACK TRANSACTION;
    THROW 50050, 'TrainingCompletions is append-only: UPDATE and DELETE are not permitted (a retake is a new completion row).', 1;
END
GO

CREATE TRIGGER [dbo].[TR_TrainingAuditEvents_AppendOnly]
ON [dbo].[TrainingAuditEvents]
AFTER UPDATE, DELETE
AS
BEGIN
    ROLLBACK TRANSACTION;
    THROW 50052, 'TrainingAuditEvents is append-only: UPDATE and DELETE are not permitted.', 1;
END
GO

CREATE TRIGGER [dbo].[TR_TrainingCourseVersions_ImmutableAfterPublish]
ON [dbo].[TrainingCourseVersions]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- DELETE branch (no inserted rows): a Published or Retired version can never be deleted.
    IF NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        IF EXISTS (SELECT 1 FROM deleted WHERE [State] IN ('Published', 'Retired'))
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50053, 'TrainingCourseVersions is immutable once Published: a Published or Retired course version cannot be deleted; a change is a new version.', 1;
        END
        RETURN;
    END

    -- UPDATE branch: any OLD row already Published/Retired is frozen, EXCEPT the single permitted
    -- pure transition Published -> Retired with every content column unchanged.
    IF EXISTS (
        SELECT 1
        FROM deleted d
        INNER JOIN inserted i ON i.CourseVersionId = d.CourseVersionId
        WHERE d.[State] IN ('Published', 'Retired')
          AND NOT (
                d.[State] = 'Published' AND i.[State] = 'Retired'
                AND NOT EXISTS (
                    SELECT d.VersionNo, d.CourseId, d.StoreId, d.ContentPagesJson, d.QuizJson, d.PassThresholdPercent, d.ContentHash
                    EXCEPT
                    SELECT i.VersionNo, i.CourseId, i.StoreId, i.ContentPagesJson, i.QuizJson, i.PassThresholdPercent, i.ContentHash
                )
          )
    )
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50053, 'TrainingCourseVersions is immutable once Published: the only permitted change to a Published version is the pure Published->Retired transition with content unchanged; a content edit, a Published->Draft demotion, or any Retired-row edit is a new version.', 1;
    END
END
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260727221455_RestaurantModules_Initial', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [WorkforceRateVersions] (
    [RateVersionId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [StaffMemberId] uniqueidentifier NOT NULL,
    [EffectiveFromUtc] datetime2 NOT NULL,
    [EffectiveToUtc] datetime2 NULL,
    [HourlyRateMinor] bigint NOT NULL,
    [Currency] nchar(3) NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceRateVersions] PRIMARY KEY ([RateVersionId]),
    CONSTRAINT [CK_WorkforceRateVersions_Bounds] CHECK ([EffectiveToUtc] IS NULL OR [EffectiveFromUtc] < [EffectiveToUtc]),
    CONSTRAINT [CK_WorkforceRateVersions_PositiveRate] CHECK ([HourlyRateMinor] > 0),
    CONSTRAINT [FK_WorkforceRateVersions_WorkforceStaffMembers_StoreId_StaffMemberId] FOREIGN KEY ([StoreId], [StaffMemberId]) REFERENCES [WorkforceStaffMembers] ([StoreId], [StaffMemberId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkforceRoleRateVersions] (
    [RoleRateVersionId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [RoleId] uniqueidentifier NOT NULL,
    [EffectiveFromUtc] datetime2 NOT NULL,
    [EffectiveToUtc] datetime2 NULL,
    [HourlyRateMinor] bigint NOT NULL,
    [Currency] nchar(3) NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceRoleRateVersions] PRIMARY KEY ([RoleRateVersionId]),
    CONSTRAINT [CK_WorkforceRoleRateVersions_Bounds] CHECK ([EffectiveToUtc] IS NULL OR [EffectiveFromUtc] < [EffectiveToUtc]),
    CONSTRAINT [CK_WorkforceRoleRateVersions_PositiveRate] CHECK ([HourlyRateMinor] > 0),
    CONSTRAINT [FK_WorkforceRoleRateVersions_WorkforceRoles_StoreId_RoleId] FOREIGN KEY ([StoreId], [RoleId]) REFERENCES [WorkforceRoles] ([StoreId], [RoleId]) ON DELETE NO ACTION
);
GO

CREATE UNIQUE INDEX [IX_WorkforceRateVersions_StoreId_StaffMemberId_EffectiveFromUtc] ON [WorkforceRateVersions] ([StoreId], [StaffMemberId], [EffectiveFromUtc]);
GO

CREATE UNIQUE INDEX [IX_WorkforceRoleRateVersions_StoreId_RoleId_EffectiveFromUtc] ON [WorkforceRoleRateVersions] ([StoreId], [RoleId], [EffectiveFromUtc]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260728203945_Workforce_W1_Rates', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [EventsNotificationOutbox] (
    [NotificationOutboxId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [EventId] int NOT NULL,
    [Kind] nvarchar(32) NOT NULL,
    [Channel] nvarchar(16) NOT NULL,
    [Status] nvarchar(32) NOT NULL,
    [LogicalDedupeKey] nvarchar(256) NOT NULL,
    [TargetReference] nvarchar(256) NULL,
    [PublicToken] uniqueidentifier NOT NULL,
    [AttemptCount] int NOT NULL,
    [MaxAttempts] int NOT NULL,
    [NextAttemptUtc] datetime2 NOT NULL,
    [LeaseOwner] nvarchar(128) NULL,
    [LeaseExpiresUtc] datetime2 NULL,
    [LastError] nvarchar(1024) NULL,
    [DeadLetteredAtUtc] datetime2 NULL,
    [SentAtUtc] datetime2 NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_EventsNotificationOutbox] PRIMARY KEY ([NotificationOutboxId])
);
GO

CREATE INDEX [IX_EventsNotificationOutbox_LeaseExpiresUtc] ON [EventsNotificationOutbox] ([LeaseExpiresUtc]);
GO

CREATE UNIQUE INDEX [IX_EventsNotificationOutbox_LogicalDedupeKey] ON [EventsNotificationOutbox] ([LogicalDedupeKey]);
GO

CREATE INDEX [IX_EventsNotificationOutbox_Status_NextAttemptUtc] ON [EventsNotificationOutbox] ([Status], [NextAttemptUtc]);
GO

CREATE INDEX [IX_EventsNotificationOutbox_StoreId_EventId] ON [EventsNotificationOutbox] ([StoreId], [EventId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260729091423_Events_NotificationOutbox', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [EventsPaymentReceipts] ADD [ActorKind] nvarchar(16) NOT NULL DEFAULT N'System';
GO

ALTER TABLE [EventsPaymentReceipts] ADD [ActorUserId] nvarchar(128) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260730143214_Events_PaymentReceiptActor', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [EventsSettlementLines] ADD [EnteredByUserId] nvarchar(128) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260730143345_Events_SettlementLineActor', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [MarginPriceImportBatches] ADD [ApprovedByReference] nvarchar(256) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260730143446_Margin_PriceImportApprovedBy', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [GrowthNewsletterVersions] ADD [CreatedByUserId] nvarchar(450) NULL;
GO

ALTER TABLE [GrowthNewsletterApprovals] ADD [InvalidatedByUserId] nvarchar(450) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260730143532_Growth_NewsletterVersionAuthor', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TRIGGER [dbo].[TR_GrowthConsentTextVersions_AppendOnly]
ON [dbo].[GrowthConsentTextVersions]
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50034, 'GrowthConsentTextVersions is append-only: UPDATE and DELETE are not permitted (publish new wording as a new version).', 1;
END;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260730150953_Growth_ConsentTextVersionAppendOnly', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [EventsEvents] ADD [DietaryRequirements] nvarchar(max) NULL;
GO

ALTER TABLE [EventsEvents] ADD [DietaryRequirementsUpdatedAtUtc] datetime2 NULL;
GO

ALTER TABLE [EventsEvents] ADD [DietaryRequirementsUpdatedByUserId] nvarchar(128) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260731210732_Events_DietaryRequirements', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [MealsMemberships] ADD [EmployeeReference] nvarchar(64) NULL;
GO

ALTER TABLE [MealsInvitations] ADD [EmployeeReference] nvarchar(64) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260731215452_Meals_MembershipEmployeeReference', N'8.0.26');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [WorkforceIdentityCodeRegisterIssues] (
    [IdentityCodeRegisterIssueId] uniqueidentifier NOT NULL,
    [StoreId] int NOT NULL,
    [LocalBusinessDate] datetime2 NOT NULL,
    [BusinessName] nvarchar(256) NULL,
    [OrganizationNumber] nvarchar(64) NULL,
    [CodeCount] int NOT NULL,
    [RowsWithoutIdentityCode] int NOT NULL,
    [DocumentSha256] nvarchar(64) NULL,
    [IssuedByActorReference] nvarchar(256) NULL,
    [IssuedAtUtc] datetime2 NOT NULL,
    [AccountingYearEndUtc] datetime2 NOT NULL,
    [RetainUntilUtc] datetime2 NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkforceIdentityCodeRegisterIssues] PRIMARY KEY ([IdentityCodeRegisterIssueId])
);
GO

CREATE INDEX [IX_WorkforceIdentityCodeRegisterIssues_StoreId_LocalBusinessDate] ON [WorkforceIdentityCodeRegisterIssues] ([StoreId], [LocalBusinessDate]);
GO

CREATE TRIGGER [dbo].[TR_WorkforceIdentityCodeRegisterIssues_RetentionLock]
ON [dbo].[WorkforceIdentityCodeRegisterIssues]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 50018, 'WorkforceIdentityCodeRegisterIssues is retention-locked (statutory personalliste kodeoversikt, 3y6m): UPDATE and DELETE are not permitted (a re-issue is a new row).', 1;
END;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260731220005_Workforce_IdentityCodeRegisterIssues', N'8.0.26');
GO

COMMIT;
GO

