# Green API WhatsApp parser

Endpoint:

```text
POST /api/green-api/webhook
```

Production URL:

```text
http://201.34.129.49:8000/api/green-api/webhook?token=<green_api.webhook_token>
```

The token is stored on the server in:

```text
/opt/pate-boxes-check/config.json
```

## Behavior

- Incoming text messages and media captions are parsed.
- Parsed boxes are uploaded to CRM when `green_api.auto_upload=true`.
- Cards with `needsReview=true` are skipped unless `green_api.force_upload=true`.
- Duplicate Green API `idMessage` values are ignored.
- Webhook payloads and parse/upload results are appended to `data/green_api_events.jsonl`.
- If a media message produces exactly one parsed card, its `downloadUrl` is attached as the card image.
- If one media message produces several cards, the image is not auto-attached to avoid assigning the wrong photo.

## Green API settings

Set Green API `webhookUrl` to:

```text
http://201.34.129.49:8000/api/green-api/webhook?token=<green_api.webhook_token>
```

Enable incoming message webhooks in Green API settings.

## Adding a new partner

1. Add partner branch aliases to `config.json` under `store_aliases`.
2. If the partner sends recurring menu items, add them to the catalog and images.
3. If the partner sends explicit prices in WhatsApp, catalog entries are optional.

Supported partner formats include:

- Royalty composed boxes with a named box and a final `Итого` line.
- Royalty composed boxes with the price in the header, for example `Бокс 1 - 1460 тг`.
- Several Royalty branches in one message (`Республика`, `Абая 48`, `Сыганак 3`).
- Coffi quantity/price lines such as `Панини с курицей -1/1890тг`.

The group context supplies the default partner when the message only contains a greeting and product lines.

Example:

```json
"store_aliases": {
  "olivka": "Olivka | Main branch",
  "royalty": "Royalty Coffee | Main branch"
}
```

## Images

Best options:

1. For recurring items: keep stable images in `images/` and reference them from the catalog.
2. For one-off WhatsApp media: send one product per image with the product text in the caption.
3. For several products in one WhatsApp message: do not attach one shared image automatically; add catalog images instead.

Use lowercase transliterated file names, for example:

```text
bananovye_rogaliki.jpg
limonnyi_tart.jpg
royalty_lunch_box.jpg
```
