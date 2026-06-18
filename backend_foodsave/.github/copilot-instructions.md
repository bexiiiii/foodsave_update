# FoodSave Backend - AI Agent Instructions

## Architecture Overview

**Project Type**: Spring Boot 3.2.3 food rescue marketplace with dual Telegram bot integration  
**Core Purpose**: Connect customers with stores selling near-expiry products via web app + Telegram Mini App + manager bot

### Key Components
- **Web API** (`/api/*`): REST endpoints for web/mobile clients with JWT auth
- **Mini App API** (`/api/miniapp/*`): Telegram WebApp integration requiring authenticated Telegram users
- **Bot Webhooks** (`/api/telegram/*`): Handles two separate Telegram bots:
  - Client bot (`/webhook`): Customer interaction for product discovery
  - Manager bot (`/webhook/manager`): Store manager operations and notifications
- **Public Endpoints**: Product/store discovery without auth (`/api/products`, `/api/stores`, `/api/categories`)

### Multi-Profile Configuration
- **dev**: H2 in-memory database at `application-dev.yml`, auto-creates schema
- **prod**: PostgreSQL at `application-prod.properties`, uses Flyway migrations in `src/main/resources/db/migration/`
- Active profile: Set via `SPRING_PROFILES_ACTIVE` env var

## Authentication & Authorization

### Dual Auth System
1. **JWT tokens** for web/mobile clients (header: `Authorization: Bearer <token>`)
2. **Telegram WebApp initData** for Mini App endpoints (validated via HMAC-SHA256 with bot token)

### Role Hierarchy (see `RolePermissionConfig.java`)
- `SUPER_ADMIN`: Full system access
- `STORE_OWNER`: Manage owned stores, products, orders
- `STORE_MANAGER`: Manage assigned store operations
- `CUSTOMER`: Place orders, write reviews

**Pattern**: Use `@PreAuthorize("hasRole('...')")` on controller methods. Auth filter in `JwtAuthenticationFilter.java` skips `/api/auth/**`, `/api/telegram/**`, public endpoints.

## Database & Performance

### Entities & Relationships
Core entities in `entity/`: `User`, `Store`, `Product`, `Order`, `Category`, `Discount`, `Review`
- **Lazy loading**: All `@ManyToOne`/`@OneToMany` use `FetchType.LAZY` with `@ToString.Exclude`
- **Auditing**: `BaseEntity` provides `id`, `createdAt`, `updatedAt` via `@EntityListeners(AuditingEntityListener.class)`
- **Enums**: OrderStatus, PaymentStatus, UserRole, etc. in `domain/enums/`

### Caching Strategy (Redis)
Multi-level TTL configured in `CacheConfig.java`:
- 2 hours: `categories`, `storesList` (static)
- 30 minutes: `products`, `stores` (dynamic)
- 5 minutes: `userOrders`, `orderStats` (frequently updated)
- 1 minute: `productStock` (real-time)

**Pattern**: Use `@Cacheable`, `@CacheEvict`, `@CachePut` on service methods. See `ProductService.java` for multi-cache invalidation example.

### Query Optimization
- **Indexes**: Created via Flyway migrations (e.g., `idx_product_store_id`, `idx_order_user_id`) and `database_indexes.sql`
- **N+1 Prevention**: Use `@EntityGraph` or `@Query` with JOIN FETCH in repositories (see `UserRepository.java`)
- **Connection Pool**: HikariCP with `maximum-pool-size=20`, `minimum-idle=5`

## Telegram Integration

### Bot Authentication
Validate Telegram WebApp `initData` via `TelegramAuthService.authenticate()`:
1. Parse query parameters (`id`, `first_name`, `auth_date`, `hash`)
2. Compute HMAC-SHA256 using bot token
3. Compare computed hash with provided hash
4. Create/update user, return JWT token

### Webhook Handlers
- `TelegramWebhookController.handleWebhook()`: Client bot (product catalog, order tracking)
- `TelegramWebhookController.handleManagerWebhook()`: Manager bot (order notifications, inventory updates)

**DTOs**: Telegram types in `dto/telegram/` (e.g., `TelegramUpdate`, `TelegramMessage`, `TelegramUser`)

## Development Workflow

### Building & Running
```bash
# Development with H2
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Production build
./mvnw clean package -DskipTests
java -jar target/backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod

# Docker
docker-compose up --build
```

### Testing & Debugging
- **Swagger UI**: Access at `/swagger-ui.html` (enabled in all profiles)
- **H2 Console**: Available at `/h2-console` (dev profile only)
- **Actuator**: `/actuator/health` for health checks
- **Redis Flush**: Use `./clear-redis-cache.sh` to clear all caches

### Deployment
- **Script**: `./deploy.sh` - SCP JAR to production server, restart systemd service
- **Server**: `root@136.243.45.111:/var/www/foodsave/`
- **Logs**: `journalctl -u foodsave-backend -f`

## Code Conventions

### Controller Patterns
```java
@RestController
@RequestMapping("/api/resource")
@RequiredArgsConstructor  // Constructor injection
@Slf4j                    // Logging
public class ResourceController {
    private final ResourceService service;
    
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")  // Role-based access
    public ResponseEntity<ResourceDTO> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }
}
```

### Service Layer
- **Transactions**: Mark write operations with `@Transactional`
- **DTOs**: Convert entities to DTOs in service layer, never expose entities
- **Validation**: Use `@Valid` on request DTOs, throw `ApiException` for business logic errors

### Exception Handling
Custom `ApiException` with HTTP status (see `exception/ApiException.java`). Global handler not shown but follows standard `@ControllerAdvice` pattern.

## File Structure Notes

- **Uploads**: Stored at `${app.upload.dir}` (default: `./uploads/`), served at `/uploads/**`
- **Static Resources**: Configured in `StaticResourceConfig.java`
- **CORS**: Multi-origin support in `CorsConfig.java` for `foodsave.kz`, `admin.foodsave.kz`, Telegram domains

## Critical Context

1. **Two separate Telegram bots**: Client bot (product discovery) and manager bot (store operations) - don't confuse their webhooks
2. **Dual auth required**: Mini App endpoints need both Telegram validation AND JWT token issuance
3. **Multi-cache invalidation**: Product updates must invalidate `products`, `productsByStore`, `featuredProducts`, `discountedProducts` simultaneously
4. **Environment secrets**: `JWT_SECRET` and `TELEGRAM_BOT_TOKEN` must be set in production, have defaults in dev
5. **Performance-first**: This app handles real-time inventory - always consider caching and query optimization when adding features

## When Adding Features

- **New entity**: Extend `BaseEntity`, add Flyway migration (`V00X__description.sql`), create repository with optimized queries
- **New endpoint**: Add to `SecurityConfig.securityFilterChain()` with appropriate access rules
- **New cache**: Configure TTL in `CacheConfig.cacheConfigurations()` based on data volatility
- **Telegram bot changes**: Update both client and manager bot handlers separately in `TelegramWebhookService` and `TelegramStoreManagerBotService`
