import java.nio.file.*;
import java.util.*;
import jdk.internal.org.objectweb.asm.*;
import jdk.internal.org.objectweb.asm.tree.*;
public class PatchRuntime implements Opcodes {
 static final String P="com/foodsave/backend/entity/Product", S="com/foodsave/backend/domain/enums/ProductStatus", D="com/foodsave/backend/dto/ProductDTO", H="com/foodsave/backend/service/CancellationStockPolicy";
 static void require(boolean b,String s){if(!b)throw new IllegalStateException(s);}
 static MethodInsnNode call(String name,String desc){return new MethodInsnNode(INVOKESTATIC,H,name,desc,false);}
 static byte[] methodBytes(MethodNode m){ClassWriter w=new ClassWriter(0);w.visit(V17,ACC_PUBLIC,"Proof",null,"java/lang/Object",null);m.accept(w);w.visitEnd();return w.toByteArray();}
 public static void main(String[] args)throws Exception{
  for(String service:List.of("ProductService","ReservationStatusService")){
   Path file=Path.of("runtime/BOOT-INF/classes/com/foodsave/backend/service/"+service+".class");
   byte[] bytes=Files.readAllBytes(file);ClassReader reader=new ClassReader(bytes);ClassNode c=new ClassNode();reader.accept(c,0);int changes=0;Map<String,byte[]> previous=new HashMap<>();for(MethodNode m:c.methods)previous.put(m.name+m.desc,methodBytes(m));
   for(MethodNode m:c.methods){
    if(service.equals("ProductService")&&m.name.equals("updateProductFromDTO")){
     require(m.desc.equals("(L"+P+";L"+D+";)V"),"DTO descriptor");int count=0;
     for(AbstractInsnNode i:m.instructions.toArray())if(i.getOpcode()==RETURN){InsnList add=new InsnList();add.add(new VarInsnNode(ALOAD,1));add.add(new VarInsnNode(ALOAD,2));add.add(call("applyManualStatus","(L"+P+";L"+D+";)V"));m.instructions.insertBefore(i,add);count++;}
     require(count==1,"DTO return count");changes++;
    }
    if(service.equals("ProductService")&&m.name.equals("updateProductStatus")){
     int count=0;for(AbstractInsnNode i:m.instructions.toArray())if(i instanceof MethodInsnNode n&&n.owner.equals(P)&&n.name.equals("setStatus")){
      require(n.desc.equals("(L"+S+";)V"),"Status setter descriptor");m.instructions.insertBefore(i,new InsnNode(DUP2));m.instructions.insert(i,call("applyManualStatus","(L"+P+";L"+S+";)V"));count++;
     }require(count==1,"Status setter count");changes++;
    }
    if(service.equals("ReservationStatusService")&&m.name.equals("restoreReservedStockIfNeeded")){
     int guards=0,restocks=0;
     for(AbstractInsnNode i:m.instructions.toArray())if(i instanceof MethodInsnNode n&&n.owner.equals(P)){
      if(n.name.equals("getStatus")){require(n.desc.equals("()L"+S+";"),"Get status descriptor");m.instructions.set(i,call("restorationStatus","(L"+P+";)L"+S+";"));guards++;}
      if(n.name.equals("setStockQuantity")){require(n.desc.equals("(Ljava/lang/Integer;)V"),"Stock descriptor");m.instructions.insertBefore(i,new InsnNode(DUP2));m.instructions.insert(i,call("afterRestock","(L"+P+";Ljava/lang/Integer;)V"));restocks++;}
     }require(guards==1&&restocks==1,"Restore guard counts");changes++;
    }
   }
   require(changes==(service.equals("ProductService")?2:1),"Method counts");
   ClassWriter writer=new ClassWriter(reader,ClassWriter.COMPUTE_MAXS);c.accept(writer);byte[] out=writer.toByteArray();
   ClassNode check=new ClassNode();new ClassReader(out).accept(check,0);require(check.methods.size()==c.methods.size(),"Methods lost");
   Set<String> allowed=service.equals("ProductService")?Set.of("updateProductFromDTO","updateProductStatus"):Set.of("restoreReservedStockIfNeeded");
   for(MethodNode m:check.methods){require(previous.containsKey(m.name+m.desc),"Unexpected method");if(!allowed.contains(m.name))require(Arrays.equals(previous.get(m.name+m.desc),methodBytes(m)),"Unrelated method changed");}
   Path dest=Path.of("classes/com/foodsave/backend/service/"+service+".class");Files.createDirectories(dest.getParent());Files.write(dest,out);
  }
  System.out.println("Patched exactly three methods in original runtime classes; all existing methods and fields preserved.");
 }
}
