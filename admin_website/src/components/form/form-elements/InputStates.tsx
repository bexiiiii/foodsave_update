"use client";
import React, { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Input from "../input/InputField";
import Label from "../Label";

export default function InputStates() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);

  // Simulate a validation check
  const validateEmail = (value: string) => {
    const isValidEmail =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
    setError(!isValidEmail);
    return isValidEmail;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };
  return (
    <ComponentCard
      title="Состояния ввода"
      desc="Стили проверки для состояний ошибки, успеха и отключения для элементов формы."
    >
      <div className="space-y-5 sm:space-y-6">
        {/* Error Input */}
        <div>
          <Label>Электронная почта</Label>
          <Input
            type="email"
            defaultValue={email}
            onChange={handleEmailChange}
            placeholder="Введите ваш адрес электронной почты"
            className={error ? "border-red-500" : ""}
          />
          {error && <p className="text-sm text-red-500 mt-1">Это неверный адрес электронной почты.</p>}
        </div>

        {/* Success Input */}
        <div>
          <Label>Электронная почта</Label>
          <Input
            type="email"
            defaultValue={email}
            onChange={handleEmailChange}
            placeholder="Введите ваш адрес электронной почты"
            className={!error ? "border-green-500" : ""}
          />
          {!error && <p className="text-sm text-green-500 mt-1">Действительный адрес электронной почты!</p>}
        </div>

        {/* Disabled Input */}
        <div>
          <Label>Электронная почта</Label>
          <Input
            type="text"
            defaultValue="disabled@example.com"
            disabled={true}
            placeholder="Отключенный адрес электронной почты"
          />
          <p className="text-sm text-gray-500 mt-1">Это поле отключено.</p>
        </div>
      </div>
    </ComponentCard>
  );
}
