package com.foodsave.backend.service;

import com.foodsave.backend.entity.Product;
import com.foodsave.backend.repository.OrderItemRepository.PurchasedDish;

import java.util.*;
import java.util.regex.Pattern;

final class NearbyDishHistory {
    private static final Pattern WORD = Pattern.compile("[\\p{L}]{3,}");
    private static final Set<String> GENERIC = Set.of("состав", "комплект", "входит", "бокс", "бокса", "набор",
            "порция", "порции", "штук", "штуки", "внутри", "сюрприз", "нет", "описания", "штучки",
            "box", "contents", "with", "and", "the", "set", "foodsave", "құрамы", "дана", "және");
    private static final Pattern GENERIC_NAME = Pattern.compile(
            "(?iu)(?:(?:сладкий|сол[её]ный|сборный|сюрприз|sweet|surprise|тәтті)\\s+)?(?:бокс|набор|box)(?:[\\p{P}\\p{S}\\s\\d]|сюрприз|surprise)*");
    private static final Pattern CONTENTS = Pattern.compile(
            "(?iu)(?:в комплект входит|состав(?: бокса)?|внутри|құрамы|contents|inside)\\s*[:：]\\s*");
    private final Map<String, Set<Long>> dishOrders = new HashMap<>();
    private final Map<Long, Set<Long>> storeOrders = new HashMap<>();

    NearbyDishHistory(List<PurchasedDish> rows) {
        for (PurchasedDish row : rows) {
            storeOrders.computeIfAbsent(row.getStoreId(), id -> new HashSet<>()).add(row.getOrderId());
            for (String word : words(dishText(row.getDishName(), row.getDescription()))) {
                dishOrders.computeIfAbsent(word, key -> new HashSet<>()).add(row.getOrderId());
            }
        }
    }

    static String dishText(String name, String description) {
        if (description != null && !description.isBlank()) {
            var marker = CONTENTS.matcher(description);
            boolean listed = marker.find();
            String contents = listed ? description.substring(marker.end()) : description;
            contents = contents.replaceAll("(?U)\\s+", " ").strip();
            if (!contents.isEmpty() && !contents.equalsIgnoreCase("Нет описания")
                    && !contents.equalsIgnoreCase("No description")
                    && (listed || name == null || name.toLowerCase(Locale.ROOT).matches(".*(?:бокс|box|набор).*"))) {
                return contents;
            }
        }
        String fallback = name == null ? "" : name.strip();
        return GENERIC_NAME.matcher(fallback).matches() ? "" : fallback;
    }

    private static Set<String> words(String text) {
        Set<String> words = new HashSet<>();
        var matcher = WORD.matcher(text.toLowerCase(Locale.ROOT).replace('ё', 'е'));
        while (matcher.find()) {
            if (!GENERIC.contains(matcher.group())) words.add(matcher.group());
        }
        return words;
    }

    int dishScore(Product box) {
        int best = 0, second = 0;
        for (String word : words(dishText(box.getName(), box.getDescription()))) {
            int frequency = dishOrders.getOrDefault(word, Set.of()).size();
            if (frequency > best) {
                second = best;
                best = frequency;
            } else {
                second = Math.max(second, frequency);
            }
        }
        return 2 * best + second;
    }

    int storeFrequency(Long id) {
        return storeOrders.getOrDefault(id, Set.of()).size();
    }
}
