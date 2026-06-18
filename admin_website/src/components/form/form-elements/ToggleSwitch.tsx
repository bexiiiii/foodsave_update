"use client";
import React from "react";
import ComponentCard from "../../common/ComponentCard";
import Switch from "../switch/Switch";

export default function ToggleSwitch() {
  const handleSwitchChange = (checked: boolean) => {
    console.log("Switch is now:", checked ? "ON" : "OFF");
  };
  return (
    <ComponentCard title="Переключатель">
      <div className="flex gap-4">
        <Switch
          label="По умолчанию"
          defaultChecked={true}
          onChange={handleSwitchChange}
        />
        <Switch
          label="Отмечено"
          defaultChecked={true}
          onChange={handleSwitchChange}
        />
        <Switch label="Отключено" disabled={true} />
      </div>{" "}
      <div className="flex gap-4">
        <Switch
          label="По умолчанию"
          defaultChecked={true}
          onChange={handleSwitchChange}
          color="gray"
        />
        <Switch
          label="Отмечено"
          defaultChecked={false}
          onChange={handleSwitchChange}
          color="gray"
        />
        <Switch label="Отключено" disabled={true} color="gray" />
      </div>
    </ComponentCard>
  );
}
