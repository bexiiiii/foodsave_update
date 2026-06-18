export interface Permission {
    name: string;
    value: string;
    description?: string;
}

export interface Role {
    name: string;
    description: string;
    permissions: Permission[];
}

export const PERMISSIONS: Permission[] = [
    // User Management
    {
        name: 'View Users',
        value: 'user:view',
        description: 'Can view user profiles and information'
    },
    {
        name: 'Create Users',
        value: 'user:create',
        description: 'Can create new user accounts'
    },
    {
        name: 'Edit Users',
        value: 'user:edit',
        description: 'Can modify user information'
    },
    {
        name: 'Delete Users',
        value: 'user:delete',
        description: 'Can remove user accounts'
    },

    // Store Management
    {
        name: 'View Stores',
        value: 'store:view',
        description: 'Can view store information'
    },
    {
        name: 'Create Stores',
        value: 'store:create',
        description: 'Can create new stores'
    },
    {
        name: 'Edit Stores',
        value: 'store:edit',
        description: 'Can modify store information'
    },
    {
        name: 'Delete Stores',
        value: 'store:delete',
        description: 'Can remove stores'
    },

    // Product Management
    {
        name: 'View Products',
        value: 'product:view',
        description: 'Can view product information'
    },
    {
        name: 'Create Products',
        value: 'product:create',
        description: 'Can create new products'
    },
    {
        name: 'Edit Products',
        value: 'product:edit',
        description: 'Can modify product information'
    },
    {
        name: 'Delete Products',
        value: 'product:delete',
        description: 'Can remove products'
    },

    // Order Management
    {
        name: 'View Orders',
        value: 'order:view',
        description: 'Can view order information'
    },
    {
        name: 'Create Orders',
        value: 'order:create',
        description: 'Can create new orders'
    },
    {
        name: 'Edit Orders',
        value: 'order:edit',
        description: 'Can modify order information'
    },
    {
        name: 'Delete Orders',
        value: 'order:delete',
        description: 'Can remove orders'
    },

    // Analytics
    {
        name: 'View Analytics',
        value: 'analytics:view',
        description: 'Can view analytics and reports'
    },
    {
        name: 'Export Analytics',
        value: 'analytics:export',
        description: 'Can export analytics data'
    },

    // Review Management
    {
        name: 'View Reviews',
        value: 'review:view',
        description: 'Can view product reviews'
    },
    {
        name: 'Moderate Reviews',
        value: 'review:moderate',
        description: 'Can moderate and manage reviews'
    },

    // Discount Management
    {
        name: 'View Discounts',
        value: 'discount:view',
        description: 'Can view discount information'
    },
    {
        name: 'Create Discounts',
        value: 'discount:create',
        description: 'Can create new discounts'
    },
    {
        name: 'Edit Discounts',
        value: 'discount:edit',
        description: 'Can modify discount information'
    },
    {
        name: 'Delete Discounts',
        value: 'discount:delete',
        description: 'Can remove discounts'
    },

    // Category Management
    {
        name: 'View Categories',
        value: 'category:view',
        description: 'Can view category information'
    },
    {
        name: 'Create Categories',
        value: 'category:create',
        description: 'Can create new categories'
    },
    {
        name: 'Edit Categories',
        value: 'category:edit',
        description: 'Can modify category information'
    },
    {
        name: 'Delete Categories',
        value: 'category:delete',
        description: 'Can remove categories'
    }
];

export const ROLES: Role[] = [
    {
        name: 'Super Admin',
        description: 'Full access to all features and settings',
        permissions: PERMISSIONS
    },
    {
        name: 'Admin',
        description: 'Access to most features with some restrictions',
        permissions: PERMISSIONS.filter(p => !p.value.includes(':delete'))
    },
    {
        name: 'Store Owner',
        description: 'Can manage their own store and products',
        permissions: PERMISSIONS.filter(p => 
            p.value.startsWith('store:') || 
            p.value.startsWith('product:') || 
            p.value.startsWith('order:') ||
            p.value.startsWith('review:') ||
            p.value.startsWith('discount:') ||
            p.value.startsWith('category:')
        )
    },
    {
        name: 'Customer',
        description: 'Basic access to view and place orders',
        permissions: PERMISSIONS.filter(p => 
            p.value === 'product:view' || 
            p.value === 'order:view' || 
            p.value === 'order:create' ||
            p.value === 'review:view'
        )
    }
]; 