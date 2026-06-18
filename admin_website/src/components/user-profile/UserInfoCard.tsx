"use client";
import React, { useEffect, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useApi } from "@/hooks/useApi";
import { toast } from "react-hot-toast";
import { UserDTO } from "@/types/api";
import { validateUserProfile, ValidationError } from "@/utils/validation";

export default function UserInfoCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [profile, setProfile] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
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
          firstName: response.firstName || "",
          lastName: response.lastName || "",
          email: response.email || "",
          phone: response.phone || "",
          address: response.address || "",
        });
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear field-specific errors when user starts typing
    setErrors(prev => prev.filter(error => error.field !== name));
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return errors.find(error => error.field === fieldName)?.message;
  };

  const handleSave = async () => {
    // Validate form data
    const validation = validateUserProfile(formData);

    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error("Please fix the validation errors");
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
      });

      await fetchProfile();
      toast.success("Profile updated successfully");
      setErrors([]);
      closeModal();
    } catch (err) {
      console.error("Failed to update profile:", err);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }
  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
            Личная информация
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Имя
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {profile?.firstName || 'N/A'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Фамилия
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {profile?.lastName || 'N/A'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Адрес электронной почты
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {profile?.email || 'N/A'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Телефон
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {profile?.phone || 'N/A'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Адрес
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {profile?.address || 'N/A'}
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

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Редактировать личную информацию
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Обновите свои данные, чтобы ваш профиль был актуальным.
            </p>
          </div>
          <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div>
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Личная информация
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Имя *</Label>
                    <Input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Введите ваше имя"
                      className={getFieldError('firstName') ? 'border-red-500' : ''}
                    />
                    {getFieldError('firstName') && (
                      <p className="mt-1 text-sm text-red-500">{getFieldError('firstName')}</p>
                    )}
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Фамилия *</Label>
                    <Input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Введите вашу фамилию"
                      className={getFieldError('lastName') ? 'border-red-500' : ''}
                    />
                    {getFieldError('lastName') && (
                      <p className="mt-1 text-sm text-red-500">{getFieldError('lastName')}</p>
                    )}
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Адрес электронной почты *</Label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Введите ваш email"
                      className={getFieldError('email') ? 'border-red-500' : ''}
                    />
                    {getFieldError('email') && (
                      <p className="mt-1 text-sm text-red-500">{getFieldError('email')}</p>
                    )}
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Телефон</Label>
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Введите ваш номер телефона"
                      className={getFieldError('phone') ? 'border-red-500' : ''}
                    />
                    {getFieldError('phone') && (
                      <p className="mt-1 text-sm text-red-500">{getFieldError('phone')}</p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <Label>Адрес</Label>
                    <Input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Введите ваш адрес"
                      className={getFieldError('address') ? 'border-red-500' : ''}
                    />
                    {getFieldError('address') && (
                      <p className="mt-1 text-sm text-red-500">{getFieldError('address')}</p>
                    )}
                  </div>
                </div>

                {errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">
                      Пожалуйста, исправьте следующие ошибки:
                    </p>
                    <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                      {errors.map((error, index) => (
                        <li key={index}>{error.message}</li>
                      ))}
                    </ul>
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
    </div>
  );
}
