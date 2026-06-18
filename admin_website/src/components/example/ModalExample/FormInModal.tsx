"use client";
import React from "react";
import ComponentCard from "../../common/ComponentCard";
import Button from "../../ui/button/Button";
import { Modal } from "../../ui/modal";
import Label from "../../form/Label";
import Input from "../../form/input/InputField";
import { useModal } from "@/hooks/useModal";

export default function FormInModal() {
  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeModal();
  };
  return (
    <ComponentCard title="Форма в модальном окне">
      <Button size="sm" onClick={openModal}>
        Открыть модальное окно
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form className="">
          <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
            Личная информация
          </h4>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div className="col-span-1">
              <Label>Имя</Label>
              <Input type="text" placeholder="Эмирхан" />
            </div>

            <div className="col-span-1">
              <Label>Фамилия</Label>
              <Input type="text" placeholder="Борух" />
            </div>

            <div className="col-span-1">
              <Label>Электронная почта</Label>
              <Input type="email" placeholder="emirhanboruch55@gmail.com" />
            </div>

            <div className="col-span-1">
              <Label>Телефон</Label>
              <Input type="text" placeholder="+09 363 398 46" />
            </div>

            <div className="col-span-1 sm:col-span-2">
              <Label>Биография</Label>
              <Input type="text" placeholder="Менеджер команды" />
            </div>
          </div>

          <div className="flex items-center justify-end w-full gap-3 mt-6">
            <Button size="sm" variant="outline" onClick={closeModal}>
              Закрыть
            </Button>
            <Button size="sm" onClick={handleSave}>
              Сохранить изменения
            </Button>
          </div>
        </form>
      </Modal>
    </ComponentCard>
  );
}
