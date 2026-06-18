"use client";
import React, { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Checkbox from "../input/Checkbox";

export default function CheckboxComponents() {
  const [isChecked, setIsChecked] = useState(false);
  const [isCheckedTwo, setIsCheckedTwo] = useState(true);
  const [isCheckedDisabled, setIsCheckedDisabled] = useState(false);
  return (
    <ComponentCard title="Флажок">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Checkbox checked={isChecked} onChange={setIsChecked} />
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-400">
            По умолчанию
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isCheckedTwo}
            onChange={setIsCheckedTwo}
            label="Отмечено"
          />
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isCheckedDisabled}
            onChange={setIsCheckedDisabled}
            disabled
            label="Отключено"
          />
        </div>
      </div>
    </ComponentCard>
  );
}
