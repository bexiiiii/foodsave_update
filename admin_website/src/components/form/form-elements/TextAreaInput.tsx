"use client";
import React, { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import TextArea from "../input/TextArea";
import Label from "../Label";

export default function TextAreaInput() {
  const [message, setMessage] = useState("");
  const [messageTwo, setMessageTwo] = useState("");
  return (
    <ComponentCard title="Поле ввода текста">
      <div className="space-y-6">
        {/* Default TextArea */}
        <div>
          <Label>Описание</Label>
          <TextArea
            value={message}
            onChange={(value) => setMessage(value)}
            rows={6}
          />
        </div>

        {/* Disabled TextArea */}
        <div>
          <Label>Описание</Label>
          <TextArea rows={6} disabled />
        </div>

        {/* Error TextArea */}
        <div>
          <Label>Описание</Label>
          <TextArea
            rows={6}
            value={messageTwo}
            error
            onChange={(value) => setMessageTwo(value)}
            hint="Пожалуйста, введите действительное сообщение."
          />
        </div>
      </div>
    </ComponentCard>
  );
}
