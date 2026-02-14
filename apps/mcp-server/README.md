# InmoAI MCP Server

**Model Context Protocol server for AI agents in Spanish real estate**

InmoAI provides AI infrastructure for the Spanish property market. This MCP server enables AI agents (Claude, GPT, Gemini, etc.) to access verified property data, initiate transactions, and book services—capabilities that are not available through other APIs.

## Why InmoAI?

| Feature | Other APIs | InmoAI |
|---------|-----------|--------|
| Property verification | ❌ | ✅ Official Cadastre integration |
| Surface area validation | ❌ | ✅ Detect inflated m² |
| Fraud detection | ❌ | ✅ Mismatch alerts |
| Escrow transactions | ❌ | ✅ Built-in trust layer |
| Service providers | ❌ | ✅ Verified local network |

## Quick Start

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "inmoai": {
      "command": "npx",
      "args": ["@inmoai/mcp-server"],
      "env": {
        "INMOAI_API_URL": "https://api.inmoai.com",
        "INMOAI_API_KEY": "your-api-key"
      }
    }
  }
}
```

### With Any MCP Client

```bash
npm install -g @inmoai/mcp-server
inmoai-mcp --api-url https://api.inmoai.com --api-key YOUR_KEY
```

## Available Tools

### 🏠 Property Verification

#### `inmoai_verify_property`
Verify a property against the Spanish Cadastre (Catastro).

**Why this matters:** The Cadastre is the official property registry. This tool detects:
- Inflated surface areas (common fraud)
- Wrong construction years
- Property type mismatches
- Address inconsistencies

```json
{
  "name": "inmoai_verify_property",
  "arguments": {
    "address": {
      "street": "Gran Vía",
      "number": "28",
      "city": "Madrid",
      "province": "Madrid"
    }
  }
}
```

**Response:**
```json
{
  "verified": true,
  "cadastralRef": "9872023VK4797F0001WX",
  "property": {
    "address": { "street": "CL GRAN VIA", "number": "28" },
    "surface": { "built": 85 },
    "use": "residential",
    "constructionYear": 1926
  },
  "verifiedAt": "2025-01-15T10:30:00Z"
}
```

### 📊 Market Intelligence

#### `inmoai_market_stats`
Get hyper-local market statistics (not available elsewhere).

```json
{
  "name": "inmoai_market_stats",
  "arguments": {
    "latitude": 40.4168,
    "longitude": -3.7038,
    "radiusMeters": 500
  }
}
```

#### `inmoai_price_history`
Get price history for a specific property.

```json
{
  "name": "inmoai_price_history",
  "arguments": {
    "cadastralRef": "9872023VK4797F0001WX"
  }
}
```

### 💰 Transactions

#### `inmoai_initiate_escrow`
Start a protected transaction with escrow.

**Fees:** 0.3% for sales, 0.5% for rentals (annual)

```json
{
  "name": "inmoai_initiate_escrow",
  "arguments": {
    "listingId": "uuid-here",
    "buyerEmail": "buyer@example.com",
    "amount": 250000,
    "conditions": [
      {
        "type": "inspection",
        "description": "Professional inspection must pass",
        "deadline": "2025-02-15"
      }
    ]
  }
}
```

#### `inmoai_schedule_visit`
Schedule a property visit (in-person or virtual).

```json
{
  "name": "inmoai_schedule_visit",
  "arguments": {
    "listingId": "uuid-here",
    "visitorName": "Juan García",
    "visitorEmail": "juan@example.com",
    "visitType": "in_person",
    "preferredDates": ["2025-01-20T10:00:00Z", "2025-01-21T15:00:00Z"]
  }
}
```

### 🔧 Service Providers

#### `inmoai_search_providers`
Find verified service providers near a location.

Categories: painting, renovation, electrical, plumbing, garden, cleaning, moving

```json
{
  "name": "inmoai_search_providers",
  "arguments": {
    "latitude": 40.4168,
    "longitude": -3.7038,
    "category": "renovation",
    "maxDistance": 15
  }
}
```

#### `inmoai_book_provider`
Request a quote from a service provider.

```json
{
  "name": "inmoai_book_provider",
  "arguments": {
    "providerId": "uuid-here",
    "serviceCategory": "painting",
    "clientName": "María López",
    "clientEmail": "maria@example.com",
    "description": "Repaint 3-bedroom apartment, approximately 90m²"
  }
}
```

## Resources

The server exposes read-only resources:

| URI | Description |
|-----|-------------|
| `inmoai://listings/verified` | Cadastre-verified property listings |
| `inmoai://providers/certified` | Certified service providers |
| `inmoai://market/spain` | Spanish market overview |

## Pricing

InmoAI uses outcome-based pricing:

| Service | Fee |
|---------|-----|
| Property verification | Free |
| Market data | Free |
| Escrow (sales) | 0.3% of transaction |
| Escrow (rentals) | 0.5% of annual rent |
| Service lead | €5 per lead |

## Authentication

Get your API key at [https://inmoai.com/developers](https://inmoai.com/developers)

```bash
export INMOAI_API_KEY=your-api-key
```

## Examples

### Agent: "Help user find and verify a property"

1. Search listings by criteria
2. For each result, call `inmoai_verify_property`
3. Show user which properties have verified data
4. Highlight any mismatches (red flags)

### Agent: "Complete a property purchase"

1. Verify property: `inmoai_verify_property`
2. Schedule visit: `inmoai_schedule_visit`
3. After approval, initiate escrow: `inmoai_initiate_escrow`
4. Find service providers for improvements: `inmoai_search_providers`

### Agent: "Get renovation quotes"

1. Analyze property needs (from listing description or visit)
2. Search providers: `inmoai_search_providers` by category
3. Book multiple quotes: `inmoai_book_provider`

## Support

- Documentation: https://docs.inmoai.com/mcp
- API Status: https://status.inmoai.com
- Contact: developers@inmoai.com

## License

MIT
