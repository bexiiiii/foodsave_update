import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Панель администратора FoodSave",
  description: "Панель администратора для проекта FoodSave",
};
export default function SignIn() {
  return <SignInForm />;
}
