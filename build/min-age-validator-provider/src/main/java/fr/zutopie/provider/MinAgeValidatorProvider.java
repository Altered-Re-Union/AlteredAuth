package fr.zutopie.provider;

import org.keycloak.provider.ConfiguredProvider;
import org.keycloak.provider.ProviderConfigProperty;
import org.keycloak.validate.AbstractStringValidator;
import org.keycloak.validate.ValidationContext;
import org.keycloak.validate.ValidationError;
import org.keycloak.validate.ValidatorConfig;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

/**
 * User-profile validator that enforces a minimum age computed from a date-of-birth
 * attribute (ISO {@code yyyy-MM-dd}, as produced by an {@code html5-date} input).
 *
 * <p>By design the reported error is <strong>neutral</strong>: it never states the
 * required threshold, so the form does not double as a how-to-bypass guide. The
 * configured minimum stays server-side only.
 */
public class MinAgeValidatorProvider extends AbstractStringValidator implements ConfiguredProvider {
    public static final String ID = "min-age";

    /** Neutral, attribute-scoped message key — must not leak the threshold. */
    public static final String MESSAGE_AGE_REQUIREMENT_NOT_MET = "error.registration.unavailable";

    public static final String CFG_MIN = "min";
    public static final int DEFAULT_MIN_AGE = 16;

    private static final List<ProviderConfigProperty> configProperties = new ArrayList<>();

    static {
        ProviderConfigProperty min = new ProviderConfigProperty();
        min.setName(CFG_MIN);
        min.setLabel("Minimum age (years)");
        min.setType(ProviderConfigProperty.STRING_TYPE);
        min.setHelpText("Minimum age, in years, required at registration.");
        min.setDefaultValue(String.valueOf(DEFAULT_MIN_AGE));
        configProperties.add(min);
    }

    public MinAgeValidatorProvider() {
    }

    @Override
    public String getId() {
        return ID;
    }

    @Override
    protected void doValidate(String value, String inputHint, ValidationContext context, ValidatorConfig config) {
        LocalDate birthDate;
        try {
            // The registration form posts an html5-date input, i.e. ISO-8601 (yyyy-MM-dd).
            birthDate = LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            // This validator owns date validation: an unparseable value can't prove the age,
            // so reject it (with the same neutral message) rather than letting it through.
            context.addError(new ValidationError(ID, inputHint, MESSAGE_AGE_REQUIREMENT_NOT_MET));
            return;
        }

        int minAge = DEFAULT_MIN_AGE;
        if (config != null) {
            Integer configured = config.getInt(CFG_MIN);
            if (configured != null) {
                minAge = configured;
            }
        }

        LocalDate today = LocalDate.now();
        // A future birth date can never satisfy the requirement.
        boolean meetsRequirement = !birthDate.isAfter(today)
            && Period.between(birthDate, today).getYears() >= minAge;

        if (!meetsRequirement) {
            context.addError(new ValidationError(ID, inputHint, MESSAGE_AGE_REQUIREMENT_NOT_MET));
        }
    }

    @Override
    public String getHelpText() {
        return "Enforces a minimum age from a date-of-birth attribute.";
    }

    @Override
    public List<ProviderConfigProperty> getConfigProperties() {
        return configProperties;
    }
}
