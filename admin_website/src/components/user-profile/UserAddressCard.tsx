"use client";
import React, { useEffect, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import TextArea from "../form/input/TextArea";
import { useApi } from "@/hooks/useApi";
import { toast } from "react-hot-toast";
import { UserDTO } from "@/types/api";
import { validateLength, ValidationError } from "@/utils/validation";

export default function UserAddressCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [profile, setProfile] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    address: "",
  });
  const { getUserProfile, updateUserProfile } = useApi();

  useEffect(() => {
    fetchProfile();
  }, [getUserProfile]);

  const fetchProfile = async () => {
    try {
      const response = await getUserProfile();
      if (response) {
        setProfile(response);
        setFormData({
          address: response.address || "",
        });
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      toast.error("Не удалось загрузить профиль");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setFormData(prev => ({ ...prev, address: value }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSave = async () => {
    // Validate address length
    const lengthError = validateLength(formData.address, 'Address', undefined, 500);
    if (lengthError) {
      setError(lengthError.message);
      toast.error(lengthError.message);
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile({
        address: formData.address.trim() || undefined,
      });

      await fetchProfile();
      toast.success("Адрес успешно обновлён");
      setError('');
      closeModal();
    } catch (err) {
      console.error("Failed to update address:", err);
      toast.error("Не удалось обновить адрес");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }
  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              Информация об адресе
            </h4>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Полный адрес
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {profile?.address || 'Адрес не указан'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                fill=""
              />
            </svg>
            Редактировать
          </button>
        </div>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Редактировать адрес
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Обновите информацию о вашем адресе.
            </p>
          </div>
          <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="px-2 overflow-y-auto custom-scrollbar">
              <div className="space-y-5">
                <div>
                  <Label>Полный адрес</Label>
                  <TextArea
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Введите ваш полный адрес (например, улица, город, штат, страна, почтовый индекс)"
                    rows={4}
                    hint="Включите улицу, город, штат/провинцию, страну и почтовый индекс. Максимум 500 символов."
                    className={error ? 'border-red-500' : ''}
                  />
                  {error && (
                    <p className="mt-1 text-sm text-red-500">{error}</p>
                  )}
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formData.address.length}/500 символов
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      {error}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal} type="button">
                Отмена
              </Button>
              <Button size="sm" type="submit" disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
