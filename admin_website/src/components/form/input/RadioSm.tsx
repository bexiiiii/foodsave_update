import React from "react";

interface RadioProps {
  id: string; // Уникальный ID для радиокнопки
  name: string; // Имя группы для радиокнопки
  value: string; // Значение радиокнопки
  checked: boolean; // Установлена ли радиокнопка
  label: string; // Текст метки для радиокнопки
  onChange: (value: string) => void; // Обработчик для переключения радиокнопки
  className?: string; // Необязательные пользовательские классы для стилизации
}

const RadioSm: React.FC<RadioProps> = ({
  id,
  name,
  value,
  checked,
  label,
  onChange,
  className = "",
}) => {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer select-none items-center text-sm text-gray-500 dark:text-gray-400 ${className}`}
    >
      <span className="relative">
        {/* Скрытый ввод */}
        <input
          type="radio"
          id={id}
          name={name}
          value={value}
          checked={checked}
          onChange={() => onChange(value)}
          className="sr-only"
        />
        {/* Стилизованный круг радиокнопки */}
        <span
          className={`mr-2 flex h-4 w-4 items-center justify-center rounded-full border ${checked
              ? "border-brand-500 bg-brand-500"
              : "bg-transparent border-gray-300 dark:border-gray-700"
            }`}
        >
          {/* Внутренняя точка */}
          <span
            className={`h-1.5 w-1.5 rounded-full ${checked ? "bg-white" : "bg-white dark:bg-[#1e2636]"
              }`}
          ></span>
        </span>
      </span>
      {label}
    </label>
  );
};

export default RadioSm;
