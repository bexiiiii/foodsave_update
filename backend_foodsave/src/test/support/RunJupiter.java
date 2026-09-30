// Offline fallback for environments with cached Jupiter but unavailable Maven Surefire.
// Executes the actual Jupiter engine, preserving extensions, lifecycle and parameterized tests.
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.engine.JupiterTestEngine;
import org.junit.platform.engine.*;
import org.junit.platform.engine.discovery.DiscoverySelectors;
public final class RunJupiter {
  public static void main(String[] args) {
    ConfigurationParameters config = new ConfigurationParameters() {
      public Optional<String> get(String key) { return Optional.ofNullable(System.getProperty(key)); }
      public Optional<Boolean> getBoolean(String key) { return get(key).map(Boolean::parseBoolean); }
      public int size() { return 0; }
      public Set<String> keySet() { return Set.of(); }
    };
    List<DiscoverySelector> selectors = Arrays.stream(args).map(DiscoverySelectors::selectClass).map(s -> (DiscoverySelector)s).toList();
    EngineDiscoveryRequest request = new EngineDiscoveryRequest() {
      public <T extends DiscoverySelector> List<T> getSelectorsByType(Class<T> type) { return selectors.stream().filter(type::isInstance).map(type::cast).toList(); }
      public <T extends DiscoveryFilter<?>> List<T> getFiltersByType(Class<T> type) { return List.of(); }
      public ConfigurationParameters getConfigurationParameters() { return config; }
    };
    AtomicInteger passed=new AtomicInteger(), failed=new AtomicInteger(), skipped=new AtomicInteger();
    EngineExecutionListener listener=new EngineExecutionListener() {
      public void executionSkipped(TestDescriptor test,String reason) { skipped.incrementAndGet(); System.out.println("SKIP " + test.getDisplayName()+": "+reason); }
      public void executionFinished(TestDescriptor test,TestExecutionResult result) {
        if(result.getStatus()==TestExecutionResult.Status.FAILED) {
          failed.incrementAndGet();System.out.println("FAIL "+test.getUniqueId());result.getThrowable().ifPresent(Throwable::printStackTrace);
        } else if(test.isTest()) { passed.incrementAndGet();System.out.println("PASS "+test.getUniqueId()); }
      }
    };
    var engine=new JupiterTestEngine();
    var root=engine.discover(request,UniqueId.forEngine(engine.getId()));
    engine.execute(new ExecutionRequest(root,listener,config));
    System.out.printf("JUPITER RESULT: passed=%d failed=%d skipped=%d%n",passed.get(),failed.get(),skipped.get());
    if(failed.get()>0 || passed.get()==0) System.exit(1);
  }
}
