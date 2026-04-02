async function getContext(user) {
    if (user.role === "employee") {
        return await getEmployeeData(user.id);
    }

    if (user.role === "companyadmin") {
        return await getCompanyStats(user.companyId);
    }

    if (user.role === "cabinetadmin") {
        return await getFinancialData(user.cabinetId);
    }

    if (user.role === "student") {
        return await getStudyData(user.id);
    }
}